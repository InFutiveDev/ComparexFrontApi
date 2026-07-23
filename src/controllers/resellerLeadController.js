import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_VALUES } from "../constants/leadWorkflow.js";
import { LeadActivity } from "../models/LeadActivity.js";
import { MerchantLead } from "../models/MerchantLead.js";
import { ResellerPartner } from "../models/ResellerPartner.js";

async function getCurrentReseller(req) {
  return ResellerPartner.findByUserId(req.userId);
}

function buildReferralLink(resellerId) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base}/merchant?rs=${resellerId.toString()}`;
}

function sanitizeForReseller(lead) {
  return {
    ...MerchantLead.sanitize(lead),
    originLabel: lead.source === "reseller-affiliate" ? "Referral Link" : "Other",
  };
}

/** FR-RS-01 / FR-RS-02 — referral link + leads referred by this reseller. */
export async function listMyResellerLeads(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const { page, limit, status, search } = req.query;

    if (status && !LEAD_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Invalid lead status" });
    }

    const [result, all] = await Promise.all([
      MerchantLead.findAllForReseller(partner._id, {
        page,
        limit,
        leadStatus: status,
        search,
      }),
      MerchantLead.findAllForReseller(partner._id, { exportAll: true }),
    ]);

    const stats = {
      total: all.total,
      new: all.items.filter((lead) => (lead.leadStatus || LEAD_STATUSES.NEW) === LEAD_STATUSES.NEW)
        .length,
      qualified: all.items.filter((lead) => lead.leadStatus === LEAD_STATUSES.QUALIFIED).length,
      assigned: all.items.filter((lead) => lead.leadStatus === LEAD_STATUSES.ASSIGNED).length,
      referral: all.items.filter((lead) => lead.source === "reseller-affiliate").length,
      completed: all.items.filter((lead) => lead.formStep >= 3).length,
    };

    return res.json({
      leads: result.items.map(sanitizeForReseller),
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats,
      statuses: LEAD_STATUS_VALUES.map((value) => ({
        value,
        label: LEAD_STATUS_LABELS[value],
      })),
      referralLink: buildReferralLink(partner._id),
      reseller: {
        id: partner._id.toString(),
        businessName: partner.businessName,
        fullName: partner.fullName,
      },
    });
  } catch (error) {
    console.error("List reseller leads error:", error);
    return res.status(500).json({ message: "Failed to fetch reseller referral leads" });
  }
}

export async function getMyResellerLead(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const lead = await MerchantLead.findByIdForReseller(req.params.id, partner._id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found for this reseller" });
    }

    const activities = await LeadActivity.findByLeadId(lead._id);
    return res.json({
      lead: sanitizeForReseller(lead),
      timeline: activities.map(LeadActivity.sanitize),
    });
  } catch (error) {
    console.error("Get reseller lead error:", error);
    return res.status(500).json({ message: "Failed to fetch referral lead" });
  }
}
