import {
  MDR_CATEGORY_OPTIONS,
  MDR_CATEGORY_VALUES,
  MDR_MODE_VALUES,
  MDR_PAYMENT_MODES,
  MDR_RATE_TYPES,
  MDR_TIER_BASIS,
  defaultMdrSettings,
} from "../constants/mdrSettings.js";
import { MdrChangeLog } from "../models/MdrChangeLog.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { PlatformSettings } from "../models/PlatformSettings.js";

function sanitizeGlobalRates(rates) {
  if (!Array.isArray(rates)) {
    return { error: "globalRates must be an array" };
  }

  const cleaned = rates.map((item, index) => {
    const paymentMode = item.paymentMode || item.id?.replace(/^global_/, "");
    if (!MDR_MODE_VALUES.includes(paymentMode)) {
      return { error: `Global MDR #${index + 1}: invalid payment mode` };
    }

    const type = item.type || "percent";
    if (!MDR_RATE_TYPES.includes(type)) {
      return { error: `Global MDR "${paymentMode}": type must be percent or flat` };
    }

    const value = Number(item.value);
    if (Number.isNaN(value) || value < 0) {
      return { error: `Global MDR "${paymentMode}": value must be a non-negative number` };
    }

    return {
      id: String(item.id || `global_${paymentMode}`).trim(),
      paymentMode,
      label: String(item.label || paymentMode).trim(),
      type,
      value,
      active: item.active !== false,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
    };
  });

  const failed = cleaned.find((item) => item.error);
  if (failed) return { error: failed.error };

  return { globalRates: cleaned };
}

function sanitizeTiers(tiers) {
  if (!Array.isArray(tiers)) {
    return { error: "tiers must be an array" };
  }

  const cleaned = tiers.map((item, index) => {
    const paymentProviderId = String(item.paymentProviderId || "").trim();
    if (!paymentProviderId) {
      return { error: `Tier #${index + 1}: paymentProviderId is required` };
    }

    const basis = item.basis || "volume";
    if (!MDR_TIER_BASIS.includes(basis)) {
      return { error: `Tier #${index + 1}: basis must be volume or category` };
    }

    const paymentMode = item.paymentMode || "upi";
    if (!MDR_MODE_VALUES.includes(paymentMode)) {
      return { error: `Tier #${index + 1}: invalid payment mode` };
    }

    const type = item.type || "percent";
    if (!MDR_RATE_TYPES.includes(type)) {
      return { error: `Tier #${index + 1}: type must be percent or flat` };
    }

    const value = Number(item.value);
    if (Number.isNaN(value) || value < 0) {
      return { error: `Tier #${index + 1}: value must be a non-negative number` };
    }

    let category = null;
    let volumeMin = 0;
    let volumeMax = null;

    if (basis === "category") {
      category = String(item.category || "").trim();
      if (!category || !MDR_CATEGORY_VALUES.includes(category)) {
        return { error: `Tier #${index + 1}: a valid category is required` };
      }
    } else {
      volumeMin = Number(item.volumeMin ?? 0);
      if (Number.isNaN(volumeMin) || volumeMin < 0) {
        return { error: `Tier #${index + 1}: volumeMin must be non-negative` };
      }
      if (item.volumeMax === "" || item.volumeMax == null) {
        volumeMax = null;
      } else {
        volumeMax = Number(item.volumeMax);
        if (Number.isNaN(volumeMax) || volumeMax < volumeMin) {
          return {
            error: `Tier #${index + 1}: volumeMax must be >= volumeMin (or empty)`,
          };
        }
      }
    }

    return {
      id: String(item.id || `tier_${Date.now()}_${index + 1}`).trim(),
      paymentProviderId,
      paymentProviderName: String(item.paymentProviderName || "").trim() || null,
      basis,
      category,
      volumeMin,
      volumeMax,
      paymentMode,
      type,
      value,
      active: item.active !== false,
    };
  });

  const failed = cleaned.find((item) => item.error);
  if (failed) return { error: failed.error };

  return { tiers: cleaned };
}

async function resolveTierWithPgNames(tiers) {
  const resolved = [];
  for (const tier of tiers) {
    let paymentProviderName = tier.paymentProviderName;
    if (!paymentProviderName) {
      const provider = await PaymentProvider.findById(tier.paymentProviderId);
      paymentProviderName = provider?.companyName || null;
    }
    resolved.push({ ...tier, paymentProviderName });
  }
  return resolved;
}

/** FR-MA-07 / FR-MA-08 — get MDR config */
export async function getAdminMdrSettings(_req, res) {
  try {
    const doc = await PlatformSettings.getOrCreate();
    const settings = PlatformSettings.sanitize(doc);
    return res.json({
      mdr: settings.mdr,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
      options: {
        paymentModes: MDR_PAYMENT_MODES,
        categories: MDR_CATEGORY_OPTIONS,
        rateTypes: MDR_RATE_TYPES,
        tierBases: MDR_TIER_BASIS,
      },
    });
  } catch (error) {
    console.error("Get MDR settings error:", error);
    return res.status(500).json({ message: "Failed to fetch MDR settings" });
  }
}

/** FR-MA-07 — save only global rates */
export async function updateAdminGlobalMdr(req, res) {
  try {
    const currentDoc = await PlatformSettings.getOrCreate();
    const current = PlatformSettings.sanitize(currentDoc).mdr;
    const ratesInput = req.body.globalRates ?? req.body.rates;

    const parsedRates = sanitizeGlobalRates(
      Array.isArray(ratesInput) ? ratesInput : ratesInput?.globalRates,
    );
    if (parsedRates.error) {
      return res.status(400).json({ message: parsedRates.error });
    }

    const nextMdr = {
      ...defaultMdrSettings(),
      ...current,
      currency: req.body.currency || current.currency || "INR",
      globalRates: parsedRates.globalRates,
      tiers: current.tiers || [],
    };

    const result = await PlatformSettings.updateSection("mdr", nextMdr, req.user);
    const settings = PlatformSettings.sanitize(result.updated);

    await MdrChangeLog.create({
      scope: "global",
      action: "update",
      message: "Global MDR rates updated across all payment gateways",
      before: { currency: current.currency, globalRates: current.globalRates },
      after: {
        currency: settings.mdr.currency,
        globalRates: settings.mdr.globalRates,
      },
      actor: req.user,
    });

    return res.json({
      message: "Global MDR rates updated successfully",
      mdr: settings.mdr,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Update global MDR error:", error);
    return res.status(500).json({ message: "Failed to update global MDR rates" });
  }
}

/** FR-MA-08 — save only per-PG tiers */
export async function updateAdminMdrTiers(req, res) {
  try {
    const currentDoc = await PlatformSettings.getOrCreate();
    const current = PlatformSettings.sanitize(currentDoc).mdr;
    const tiersInput = req.body.tiers ?? req.body;

    const parsedTiers = sanitizeTiers(Array.isArray(tiersInput) ? tiersInput : []);
    if (parsedTiers.error) {
      return res.status(400).json({ message: parsedTiers.error });
    }

    const tiers = await resolveTierWithPgNames(parsedTiers.tiers);

    const nextMdr = {
      ...defaultMdrSettings(),
      ...current,
      globalRates: current.globalRates || [],
      tiers,
    };

    const result = await PlatformSettings.updateSection("mdr", nextMdr, req.user);
    const settings = PlatformSettings.sanitize(result.updated);

    await MdrChangeLog.create({
      scope: "tier",
      action: "update",
      message: `Per-PG tiered MDR updated (${tiers.length} tier${tiers.length === 1 ? "" : "s"})`,
      before: { tiers: current.tiers },
      after: { tiers: settings.mdr.tiers },
      actor: req.user,
    });

    return res.json({
      message: "Per-PG tiered MDR updated successfully",
      mdr: settings.mdr,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Update MDR tiers error:", error);
    return res.status(500).json({ message: "Failed to update MDR tiers" });
  }
}

/** FR-MA-09 — audit log */
export async function listAdminMdrAudit(req, res) {
  try {
    const { page, limit, scope } = req.query;
    const result = await MdrChangeLog.findAll({ page, limit, scope });

    return res.json({
      logs: result.items.map(MdrChangeLog.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("List MDR audit error:", error);
    return res.status(500).json({ message: "Failed to fetch MDR change log" });
  }
}
