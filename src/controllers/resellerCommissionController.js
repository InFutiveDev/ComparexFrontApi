import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_VALUES,
} from "../constants/resellerFinance.js";
import { ResellerCommission } from "../models/ResellerCommission.js";
import { ResellerPartner } from "../models/ResellerPartner.js";
import {
  getCommissionSlabsForReseller,
  syncGmvAndCommissionsForReseller,
} from "../services/resellerFinance.js";

async function getCurrentReseller(req) {
  return ResellerPartner.findByUserId(req.userId);
}

/** FR-RS-05 / FR-RS-06 — commissions from configurable slabs with status tracking. */
export async function listMyResellerCommissions(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    await syncGmvAndCommissionsForReseller(partner._id);

    const { status, from, to, merchantId, page, limit } = req.query;

    if (status && !COMMISSION_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Invalid commission status" });
    }

    const [result, slabs] = await Promise.all([
      ResellerCommission.findForReseller(partner._id, {
        status,
        from,
        to,
        merchantLeadId: merchantId,
        page,
        limit,
      }),
      getCommissionSlabsForReseller(),
    ]);

    return res.json({
      commissions: result.items.map(ResellerCommission.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats: result.stats,
      rateSlabs: slabs,
      statuses: COMMISSION_STATUS_VALUES.map((value) => ({
        value,
        label: COMMISSION_STATUS_LABELS[value],
      })),
    });
  } catch (error) {
    console.error("List reseller commissions error:", error);
    return res.status(500).json({ message: "Failed to fetch commissions" });
  }
}

export async function getMyResellerCommissionSlabs(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const slabs = await getCommissionSlabsForReseller();
    return res.json({ rateSlabs: slabs });
  } catch (error) {
    console.error("Get commission slabs error:", error);
    return res.status(500).json({ message: "Failed to fetch commission slabs" });
  }
}
