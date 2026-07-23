import { MerchantLead } from "../models/MerchantLead.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { ResellerCommission } from "../models/ResellerCommission.js";
import { ResellerGmvRecord } from "../models/ResellerGmvRecord.js";
import { USER_ROLES } from "../constants/userRoles.js";

function monthPeriod(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodStart: start, periodEnd: end };
}

function estimateGmvFromLead(lead) {
  if (lead.estimatedMonthlyVolume && Number(lead.estimatedMonthlyVolume) > 0) {
    return Number(lead.estimatedMonthlyVolume);
  }

  const step = Number(lead.formStep) || 1;
  if (step >= 3) return 500000;
  if (step >= 2) return 150000;
  return 50000;
}

export function getResellerRateSlabs(feeSettings) {
  return (feeSettings?.structures || []).filter(
    (slab) => slab.active && slab.appliesTo?.includes(USER_ROLES.RESELLER),
  );
}

export function calculateCommissionAmount(gmvAmount, slab) {
  if (slab.type === "percent") {
    return Math.round((gmvAmount * Number(slab.value)) / 100);
  }
  return Number(slab.value) || 0;
}

export async function syncGmvAndCommissionsForReseller(resellerId) {
  const leads = await MerchantLead.findAllForReseller(resellerId, { exportAll: true });
  const { periodStart, periodEnd } = monthPeriod();

  for (const lead of leads.items) {
    const exists = await ResellerGmvRecord.existsForLeadPeriod(
      resellerId,
      lead._id,
      periodStart,
      periodEnd,
    );
    if (exists) continue;

    const amount = estimateGmvFromLead(lead);
    const gmvRecord = await ResellerGmvRecord.create({
      resellerId,
      merchantLeadId: lead._id,
      merchantName: lead.businessName,
      amount,
      periodStart,
      periodEnd,
      recordedAt: new Date(),
    });

    await syncCommissionsForGmvRecord(resellerId, lead, gmvRecord);
  }

  await syncFlatOpportunityCommissions(resellerId, leads.items);
}

async function syncCommissionsForGmvRecord(resellerId, lead, gmvRecord) {
  const settings = await PlatformSettings.getOrCreate();
  const slabs = getResellerRateSlabs(settings.fees);

  for (const slab of slabs) {
    if (slab.type !== "percent") continue;

    const exists = await ResellerCommission.existsForSlabAndLead(
      resellerId,
      lead._id,
      slab.id,
      gmvRecord._id,
    );
    if (exists) continue;

    await ResellerCommission.create({
      resellerId,
      merchantLeadId: lead._id,
      merchantName: lead.businessName,
      gmvRecordId: gmvRecord._id,
      amount: calculateCommissionAmount(gmvRecord.amount, slab),
      rateSlabId: slab.id,
      rateSlabName: slab.name,
      rateType: slab.type,
      rateValue: slab.value,
      periodStart: gmvRecord.periodStart,
      periodEnd: gmvRecord.periodEnd,
    });
  }
}

async function syncFlatOpportunityCommissions(resellerId, leads) {
  const settings = await PlatformSettings.getOrCreate();
  const flatSlabs = getResellerRateSlabs(settings.fees).filter((slab) => slab.type === "flat");

  for (const lead of leads) {
    if ((lead.formStep || 1) < 2) continue;

    for (const slab of flatSlabs) {
      const exists = await ResellerCommission.existsForSlabAndLead(
        resellerId,
        lead._id,
        slab.id,
        null,
      );
      if (exists) continue;

      await ResellerCommission.create({
        resellerId,
        merchantLeadId: lead._id,
        merchantName: lead.businessName,
        gmvRecordId: null,
        amount: calculateCommissionAmount(0, slab),
        rateSlabId: slab.id,
        rateSlabName: slab.name,
        rateType: slab.type,
        rateValue: slab.value,
        periodStart: lead.createdAt,
        periodEnd: new Date(),
      });
    }
  }
}

export async function getCommissionSlabsForReseller() {
  const settings = await PlatformSettings.getOrCreate();
  return getResellerRateSlabs(settings.fees).map((slab) => ({
    id: slab.id,
    name: slab.name,
    description: slab.description,
    type: slab.type,
    value: slab.value,
    minAmount: slab.minAmount,
    maxAmount: slab.maxAmount,
  }));
}
