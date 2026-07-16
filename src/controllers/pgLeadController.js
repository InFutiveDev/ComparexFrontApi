import {
  LEAD_ACTIVITY_TYPES,
  PG_LEAD_STATUSES,
  PG_LEAD_STATUS_LABELS,
  PG_LEAD_STATUS_VALUES,
} from "../constants/leadWorkflow.js";
import { LeadActivity } from "../models/LeadActivity.js";
import { MerchantLead } from "../models/MerchantLead.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { notifyPgLeadStatusUpdate } from "../services/notifyPgLeadStatus.js";
import { pgLeadsToCsv, pgLeadsToExcelXml } from "../utils/exportPgLeads.js";
import { parseObjectId } from "../utils/objectId.js";

const notificationsEnabled = process.env.NOTIFICATIONS_ENABLED === "true";

async function getCurrentProvider(req) {
  return PaymentProvider.findByUserId(req.userId);
}

function leadOrigin(lead) {
  return lead.source === "pg-affiliate" ? "PG Affiliate Link" : "Sub Admin Assigned";
}

function sanitizeForPg(lead) {
  return {
    ...MerchantLead.sanitize(lead),
    originLabel: leadOrigin(lead),
  };
}

/** FR-PG-03 — assigned and affiliate leads scoped to the logged-in PG. */
export async function listMyPgLeads(req, res) {
  try {
    const provider = await getCurrentProvider(req);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const { page, limit, status, source, search } = req.query;
    if (status && !PG_LEAD_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Invalid PG lead status" });
    }

    const [result, all] = await Promise.all([
      MerchantLead.findAllForPg(provider._id, {
        page,
        limit,
        pgLeadStatus: status,
        source,
        search,
      }),
      MerchantLead.findAllForPg(provider._id, { exportAll: true }),
    ]);

    const stats = {
      total: all.total,
      pending: all.items.filter(
        (lead) => (lead.pgLeadStatus || PG_LEAD_STATUSES.PENDING) === PG_LEAD_STATUSES.PENDING,
      ).length,
      live: all.items.filter((lead) => lead.pgLeadStatus === PG_LEAD_STATUSES.LIVE).length,
      rejected: all.items.filter(
        (lead) => lead.pgLeadStatus === PG_LEAD_STATUSES.REJECTED,
      ).length,
      affiliate: all.items.filter((lead) => lead.source === "pg-affiliate").length,
    };

    return res.json({
      leads: result.items.map(sanitizeForPg),
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats,
      statuses: PG_LEAD_STATUS_VALUES.map((value) => ({
        value,
        label: PG_LEAD_STATUS_LABELS[value],
      })),
      affiliateLink: `${process.env.FRONTEND_URL || "http://localhost:3000"}/merchant?pg=${provider._id.toString()}`,
    });
  } catch (error) {
    console.error("List PG leads error:", error);
    return res.status(500).json({ message: "Failed to fetch PG leads" });
  }
}

export async function getMyPgLead(req, res) {
  try {
    const provider = await getCurrentProvider(req);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const lead = await MerchantLead.findByIdForPg(req.params.id, provider._id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found for this payment gateway" });
    }

    const activities = await LeadActivity.findByLeadId(lead._id);
    return res.json({
      lead: sanitizeForPg(lead),
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Get PG lead error:", error);
    return res.status(500).json({ message: "Failed to fetch PG lead" });
  }
}

/** FR-PG-04 / FR-PG-05 — status update with remarks and notifications. */
export async function updateMyPgLeadStatus(req, res) {
  try {
    const provider = await getCurrentProvider(req);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const lead = await MerchantLead.findByIdForPg(req.params.id, provider._id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found for this payment gateway" });
    }

    const status = String(req.body.status || "").trim().toLowerCase();
    const remarks = String(req.body.remarks || "").trim();
    if (![PG_LEAD_STATUSES.LIVE, PG_LEAD_STATUSES.REJECTED].includes(status)) {
      return res.status(400).json({ message: "Status must be Live or Rejected" });
    }
    if (!remarks) {
      return res.status(400).json({ message: "Remarks are mandatory for status updates" });
    }

    const now = new Date();
    const { updated } = await MerchantLead.updateById(lead._id, {
      pgLeadStatus: status,
      pgRemarks: remarks,
      pgStatusUpdatedAt: now,
      pgStatusUpdatedBy: parseObjectId(req.userId) || req.userId,
    });

    await LeadActivity.create({
      leadId: lead._id,
      type: LEAD_ACTIVITY_TYPES.PG_STATUS_UPDATED,
      message: `${provider.companyName} marked the lead ${PG_LEAD_STATUS_LABELS[status]}`,
      actorId: req.userId,
      actorName: req.user?.name || provider.companyName,
      actorRole: "payment_provider",
      meta: {
        previousStatus: lead.pgLeadStatus || PG_LEAD_STATUSES.PENDING,
        status,
        remarks,
        paymentProviderId: provider._id.toString(),
      },
    });

    const notifications = notificationsEnabled
      ? await notifyPgLeadStatusUpdate({
          lead,
          provider,
          status,
          remarks,
          actor: req.user,
        })
      : [];
    const activities = await LeadActivity.findByLeadId(lead._id);

    return res.json({
      message: `Lead status updated to ${PG_LEAD_STATUS_LABELS[status]}`,
      lead: sanitizeForPg(updated),
      notificationsCreated: notifications.length,
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Update PG lead status error:", error);
    return res.status(500).json({ message: "Failed to update PG lead status" });
  }
}

/** FR-PG-03 — download the PG's filtered lead set as CSV or Excel .xls. */
export async function exportMyPgLeads(req, res) {
  try {
    const provider = await getCurrentProvider(req);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const format = String(req.query.format || "csv").toLowerCase();
    if (!["csv", "xls"].includes(format)) {
      return res.status(400).json({ message: "Export format must be csv or xls" });
    }

    const result = await MerchantLead.findAllForPg(provider._id, {
      pgLeadStatus: req.query.status,
      source: req.query.source,
      search: req.query.search,
      exportAll: true,
    });
    const rows = result.items.map(sanitizeForPg);
    const date = new Date().toISOString().slice(0, 10);

    if (format === "xls") {
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="pg-leads-${date}.xls"`);
      return res.send(pgLeadsToExcelXml(rows));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="pg-leads-${date}.csv"`);
    return res.send(`\uFEFF${pgLeadsToCsv(rows)}`);
  } catch (error) {
    console.error("Export PG leads error:", error);
    return res.status(500).json({ message: "Failed to export PG leads" });
  }
}
