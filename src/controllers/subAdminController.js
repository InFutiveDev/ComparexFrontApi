import {
  LEAD_ACTIVITY_TYPES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_VALUES,
  LEAD_STATUSES,
} from "../constants/leadWorkflow.js";
import { MERCHANT_INDUSTRIES, MERCHANT_PRIORITIES } from "../constants/merchantForm.js";
import { ExpertBooking } from "../models/ExpertBooking.js";
import { LeadActivity } from "../models/LeadActivity.js";
import { MerchantLead } from "../models/MerchantLead.js";
import { Notification } from "../models/Notification.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { notifyPgLeadAssignment } from "../services/notifyPg.js";
import { parseCsv } from "../utils/csv.js";
import { parseObjectId } from "../utils/objectId.js";

function actorFromReq(req) {
  return req.user ?? {
    _id: req.userId,
    name: req.userEmail,
    role: req.userRole,
  };
}

async function recordActivity(leadId, type, message, actor, meta = {}) {
  return LeadActivity.create({
    leadId,
    type,
    message,
    actorId: actor?._id?.toString?.() ?? actor?._id ?? null,
    actorName: actor?.name ?? null,
    actorRole: actor?.role ?? null,
    meta,
  });
}

export function getSubAdminOptions(_req, res) {
  return res.json({
    leadStatuses: LEAD_STATUS_VALUES.map((value) => ({
      value,
      label: LEAD_STATUS_LABELS[value],
    })),
    industries: MERCHANT_INDUSTRIES,
    priorities: MERCHANT_PRIORITIES,
    assignmentActions: [
      { value: "assign_pg", label: "Assign to Payment Gateway" },
      { value: "talk_to_expert", label: "Book Talk to Expert" },
    ],
  });
}

/** FR-SA-01 / FR-SA-05 — list & filter merchant leads */
export async function listLeads(req, res) {
  try {
    const { page, limit, status, industry, location, assignedPgId, search } = req.query;
    const result = await MerchantLead.findAll({
      page,
      limit,
      status,
      industry,
      location,
      assignedPgId,
      search,
    });

    return res.json({
      leads: result.items.map(MerchantLead.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("List leads error:", error);
    return res.status(500).json({ message: "Failed to fetch leads" });
  }
}

/** FR-SA-03 — lead detail + activity timeline */
export async function getLeadDetail(req, res) {
  try {
    const lead = await MerchantLead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const activities = await LeadActivity.findByLeadId(req.params.id);

    return res.json({
      lead: MerchantLead.sanitize(lead),
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Get lead detail error:", error);
    return res.status(500).json({ message: "Failed to fetch lead details" });
  }
}

/** FR-SA-02 — update lead status (New, In Review, Qualified, Rejected, ...) */
export async function updateLeadStatus(req, res) {
  try {
    const { status, notes } = req.body;
    const leadId = req.params.id;

    if (!status || !LEAD_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${LEAD_STATUS_VALUES.join(", ")}`,
      });
    }

    const lead = await MerchantLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const previousStatus = lead.leadStatus ?? LEAD_STATUSES.NEW;
    const updates = {
      leadStatus: status,
    };

    if (notes !== undefined) {
      updates.qualificationNotes = String(notes).trim() || null;
    }

    const { updated } = await MerchantLead.updateById(leadId, updates);
    if (!updated) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const actor = actorFromReq(req);
    await recordActivity(
      leadId,
      status === LEAD_STATUSES.QUALIFIED
        ? LEAD_ACTIVITY_TYPES.QUALIFIED
        : LEAD_ACTIVITY_TYPES.STATUS_UPDATED,
      `Lead status changed from ${LEAD_STATUS_LABELS[previousStatus] ?? previousStatus} to ${LEAD_STATUS_LABELS[status]}`,
      actor,
      { previousStatus, status, notes: updates.qualificationNotes },
    );

    const activities = await LeadActivity.findByLeadId(leadId);

    return res.json({
      message: "Lead status updated successfully",
      lead: MerchantLead.sanitize(updated),
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Update lead status error:", error);
    return res.status(500).json({ message: "Failed to update lead status" });
  }
}

/** FR-SA-05 — list PGs filterable by category, performance, location */
export async function listAssignablePgs(req, res) {
  try {
    const {
      page,
      limit,
      location,
      category,
      industry,
      minSuccessRate,
      minSettlementScore,
      search,
    } = req.query;

    const result = await PaymentProvider.findAll({
      page,
      limit,
      location,
      category: category || industry,
      minSuccessRate,
      minSettlementScore,
      search,
    });

    return res.json({
      paymentGateways: result.items.map(PaymentProvider.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("List assignable PGs error:", error);
    return res.status(500).json({ message: "Failed to fetch payment gateways" });
  }
}

/** FR-SA-04 + FR-SA-06 — assign qualified lead to PG and notify */
export async function assignLeadToPg(req, res) {
  try {
    const leadId = req.params.id;
    const { paymentGatewayId, notes } = req.body;

    if (!paymentGatewayId) {
      return res.status(400).json({ message: "paymentGatewayId is required" });
    }

    const lead = await MerchantLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const currentStatus = lead.leadStatus ?? LEAD_STATUSES.NEW;
    if (currentStatus === LEAD_STATUSES.REJECTED) {
      return res.status(400).json({ message: "Rejected leads cannot be assigned" });
    }

    if (
      currentStatus !== LEAD_STATUSES.QUALIFIED &&
      currentStatus !== LEAD_STATUSES.ASSIGNED
    ) {
      return res.status(400).json({
        message: "Lead must be Qualified before assignment. Update status to qualified first.",
      });
    }

    const provider = await PaymentProvider.findById(paymentGatewayId);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const actor = actorFromReq(req);
    const now = new Date();

    const { updated } = await MerchantLead.updateById(leadId, {
      leadStatus: LEAD_STATUSES.ASSIGNED,
      assignedPgId: provider._id,
      assignedPgName: provider.companyName,
      assignedAt: now,
      assignedBy: parseObjectId(actor._id) || actor._id,
      qualificationNotes:
        notes !== undefined ? String(notes).trim() || null : lead.qualificationNotes ?? null,
    });

    await recordActivity(
      leadId,
      LEAD_ACTIVITY_TYPES.ASSIGNED_TO_PG,
      `Lead assigned to payment gateway ${provider.companyName}`,
      actor,
      {
        paymentGatewayId: provider._id.toString(),
        paymentGatewayName: provider.companyName,
        notes: notes ?? null,
      },
    );

    const notification = await notifyPgLeadAssignment({
      provider,
      lead: updated,
      actor,
    });

    const activities = await LeadActivity.findByLeadId(leadId);

    return res.json({
      message: "Lead assigned to payment gateway successfully",
      lead: MerchantLead.sanitize(updated),
      notification: Notification.sanitize(notification),
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Assign lead error:", error);
    return res.status(500).json({ message: "Failed to assign lead" });
  }
}

/** FR-SA-04 — book Talk to Expert from a lead */
export async function bookTalkToExpert(req, res) {
  try {
    const leadId = req.params.id;
    const lead = await MerchantLead.findById(leadId);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const {
      preferredDate,
      preferredTime,
      timezone,
      paymentGatewayId,
      paymentGatewayName,
      notes,
      calendlyEventUri,
      calendlyInviteeUri,
    } = req.body;

    let resolvedPgName = paymentGatewayName ?? null;
    if (paymentGatewayId) {
      const provider = await PaymentProvider.findById(paymentGatewayId);
      if (!provider) {
        return res.status(404).json({ message: "Payment gateway not found" });
      }
      resolvedPgName = provider.companyName;
    }

    const actor = actorFromReq(req);
    const booking = await ExpertBooking.create({
      fullName: lead.businessName,
      businessName: lead.businessName,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry ?? null,
      priority: lead.priority ?? null,
      paymentGatewayId: paymentGatewayId ? parseObjectId(paymentGatewayId) : null,
      paymentGatewayName: resolvedPgName,
      merchantLeadId: lead._id,
      preferredDate: preferredDate ?? null,
      preferredTime: preferredTime ?? null,
      timezone: timezone ?? null,
      notes: notes ?? lead.qualificationNotes ?? null,
      calendlyEventUri: calendlyEventUri ?? null,
      calendlyInviteeUri: calendlyInviteeUri ?? null,
      bookingSource: "sub-admin",
      status: "new",
      source: "talk-to-expert",
    });

    const { updated } = await MerchantLead.updateById(leadId, {
      leadStatus: LEAD_STATUSES.EXPERT_BOOKED,
      expertBookingId: booking._id,
    });

    await recordActivity(
      leadId,
      LEAD_ACTIVITY_TYPES.EXPERT_BOOKED,
      "Talk to Expert booked for this lead",
      actor,
      {
        expertBookingId: booking._id.toString(),
        paymentGatewayId: paymentGatewayId ?? null,
        paymentGatewayName: resolvedPgName,
      },
    );

    const activities = await LeadActivity.findByLeadId(leadId);

    return res.status(201).json({
      message: "Talk to Expert booked successfully",
      lead: MerchantLead.sanitize(updated),
      booking: ExpertBooking.sanitize(booking),
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Book talk to expert error:", error);
    return res.status(500).json({ message: "Failed to book Talk to Expert" });
  }
}

/**
 * FR-SA-04 — bulk upload leads and assign to a specific PG.
 * Accepts multipart field `file` (CSV) or JSON body `{ paymentGatewayId, leads: [...] }`.
 * CSV headers: businessName, email, phone, industry, priority, location
 */
export async function bulkUploadLeadsToPg(req, res) {
  try {
    const paymentGatewayId = req.body.paymentGatewayId;

    if (!paymentGatewayId) {
      return res.status(400).json({ message: "paymentGatewayId is required" });
    }

    const provider = await PaymentProvider.findById(paymentGatewayId);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    let rows = [];

    if (req.file?.buffer) {
      rows = parseCsv(req.file.buffer.toString("utf8"));
    } else if (Array.isArray(req.body.leads)) {
      rows = req.body.leads;
    } else if (typeof req.body.leads === "string") {
      try {
        rows = JSON.parse(req.body.leads);
      } catch {
        return res.status(400).json({ message: "Invalid leads JSON" });
      }
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        message: "Provide a CSV file (field: file) or a leads array in the body",
      });
    }

    const actor = actorFromReq(req);
    const created = [];
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const businessName = String(row.businessName || "").trim();
      const email = String(row.email || "").trim().toLowerCase();
      const phone = String(row.phone || "").trim();

      if (!businessName || !email || !phone) {
        errors.push({
          row: index + 1,
          message: "businessName, email, and phone are required",
        });
        continue;
      }

      try {
        const now = new Date();
        const lead = await MerchantLead.create({
          businessName,
          email,
          phone,
          industry: row.industry?.trim() || null,
          priority: row.priority?.trim() || null,
          location: row.location?.trim() || null,
          leadStatus: LEAD_STATUSES.ASSIGNED,
          assignedPgId: provider._id,
          assignedPgName: provider.companyName,
          assignedAt: now,
          assignedBy: parseObjectId(actor._id) || actor._id,
          source: "bulk-upload",
          formStep: 3,
        });

        await recordActivity(
          lead._id,
          LEAD_ACTIVITY_TYPES.BULK_UPLOADED,
          `Lead bulk-uploaded and assigned to ${provider.companyName}`,
          actor,
          { paymentGatewayId: provider._id.toString() },
        );

        await notifyPgLeadAssignment({ provider, lead, actor });
        created.push(MerchantLead.sanitize(lead));
      } catch (error) {
        errors.push({ row: index + 1, message: error.message || "Failed to create lead" });
      }
    }

    return res.status(201).json({
      message: `Bulk upload completed. ${created.length} lead(s) assigned to ${provider.companyName}`,
      paymentGateway: PaymentProvider.sanitize(provider),
      createdCount: created.length,
      errorCount: errors.length,
      leads: created,
      errors,
    });
  } catch (error) {
    console.error("Bulk upload leads error:", error);
    return res.status(500).json({ message: "Failed to bulk upload leads" });
  }
}

export async function listPgNotifications(req, res) {
  try {
    const { page, limit, paymentGatewayId } = req.query;

    const result = await Notification.findByRecipient({
      recipientType: "payment_provider",
      recipientId: paymentGatewayId || undefined,
      page,
      limit,
    });

    return res.json({
      notifications: result.items.map(Notification.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("List PG notifications error:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
}
