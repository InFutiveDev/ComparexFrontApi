import { ResellerPartner } from "../models/ResellerPartner.js";
import { ResellerGmvRecord } from "../models/ResellerGmvRecord.js";
import { syncGmvAndCommissionsForReseller } from "../services/resellerFinance.js";

async function getCurrentReseller(req) {
  return ResellerPartner.findByUserId(req.userId);
}

/** FR-RS-03 / FR-RS-04 — GMV from referred merchants with date + merchant filters. */
export async function listMyResellerGmv(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    await syncGmvAndCommissionsForReseller(partner._id);

    const { from, to, merchantId, page, limit } = req.query;
    const result = await ResellerGmvRecord.findForReseller(partner._id, {
      from,
      to,
      merchantLeadId: merchantId,
      page,
      limit,
    });

    const merchants = await ResellerGmvRecord.listMerchantsForReseller(partner._id);

    return res.json({
      records: result.items.map(ResellerGmvRecord.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalGmv: result.totalGmv,
      merchants: merchants.map((item) => ({
        id: item._id?.toString?.() ?? null,
        businessName: item.merchantName,
        totalGmv: item.totalGmv,
      })),
    });
  } catch (error) {
    console.error("List reseller GMV error:", error);
    return res.status(500).json({ message: "Failed to fetch GMV data" });
  }
}
