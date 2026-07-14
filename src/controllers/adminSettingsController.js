import {
  FEE_APPLIES_TO,
  FEE_TYPES,
  PAYOUT_SCHEDULES,
  PLATFORM_PERMISSIONS,
  defaultFeeSettings,
  defaultPermissionSettings,
  defaultPayoutSettings,
} from "../constants/platformSettings.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { PlatformSettings } from "../models/PlatformSettings.js";

function sanitizeFeeStructures(structures) {
  if (!Array.isArray(structures)) {
    return { error: "structures must be an array" };
  }

  const cleaned = structures.map((item, index) => {
    const id = String(item.id || `fee_${index + 1}`).trim();
    const name = String(item.name || "").trim();
    const type = item.type || "percent";
    const appliesTo = Array.isArray(item.appliesTo)
      ? item.appliesTo.map(String).filter((role) => FEE_APPLIES_TO.includes(role))
      : [];

    if (!name) {
      return { error: `Fee #${index + 1}: name is required` };
    }
    if (!FEE_TYPES.includes(type)) {
      return { error: `Fee "${name}": type must be percent or flat` };
    }

    const value = Number(item.value);
    if (Number.isNaN(value) || value < 0) {
      return { error: `Fee "${name}": value must be a non-negative number` };
    }

    return {
      id,
      name,
      description: String(item.description || "").trim(),
      appliesTo,
      type,
      value,
      minAmount: item.minAmount == null || item.minAmount === "" ? 0 : Number(item.minAmount),
      maxAmount:
        item.maxAmount == null || item.maxAmount === ""
          ? null
          : Number(item.maxAmount),
      active: Boolean(item.active),
    };
  });

  const failed = cleaned.find((item) => item.error);
  if (failed) return { error: failed.error };

  return { structures: cleaned };
}

function sanitizePermissions(roles) {
  if (!Array.isArray(roles)) {
    return { error: "roles must be an array" };
  }

  const knownRoles = Object.values(USER_ROLES);
  const permissionKeys = new Set([
    "*",
    ...PLATFORM_PERMISSIONS.map((item) => item.key),
  ]);

  const cleaned = roles.map((item) => {
    const role = item.role;
    if (!knownRoles.includes(role)) {
      return { error: `Unknown role: ${role}` };
    }

    let permissions = Array.isArray(item.permissions)
      ? item.permissions.map(String)
      : [];

    if (role === USER_ROLES.ADMIN && !permissions.includes("*")) {
      permissions = ["*"];
    }

    const invalid = permissions.find((key) => !permissionKeys.has(key));
    if (invalid) {
      return { error: `Invalid permission "${invalid}" for role ${role}` };
    }

    return {
      role,
      label: item.label || role,
      permissions,
    };
  });

  const failed = cleaned.find((item) => item.error);
  if (failed) return { error: failed.error };

  for (const role of knownRoles) {
    if (!cleaned.some((item) => item.role === role)) {
      return { error: `Missing access definition for role: ${role}` };
    }
  }

  return { roles: cleaned };
}

function sanitizePayouts(payload) {
  const schedule = payload.payoutSchedule || "monthly";
  if (!PAYOUT_SCHEDULES.includes(schedule)) {
    return { error: `payoutSchedule must be one of: ${PAYOUT_SCHEDULES.join(", ")}` };
  }

  const minPayoutAmount = Number(payload.minPayoutAmount);
  const payoutDayOfMonth = Number(payload.payoutDayOfMonth);
  const holdDaysAfterActivation = Number(payload.holdDaysAfterActivation);
  const autoApproveBelow = Number(payload.autoApproveBelow);

  if (Number.isNaN(minPayoutAmount) || minPayoutAmount < 0) {
    return { error: "minPayoutAmount must be a non-negative number" };
  }
  if (
    Number.isNaN(payoutDayOfMonth) ||
    payoutDayOfMonth < 1 ||
    payoutDayOfMonth > 28
  ) {
    return { error: "payoutDayOfMonth must be between 1 and 28" };
  }
  if (Number.isNaN(holdDaysAfterActivation) || holdDaysAfterActivation < 0) {
    return { error: "holdDaysAfterActivation must be a non-negative number" };
  }
  if (Number.isNaN(autoApproveBelow) || autoApproveBelow < 0) {
    return { error: "autoApproveBelow must be a non-negative number" };
  }

  const rules = Array.isArray(payload.rules) ? payload.rules : [];
  const cleanedRules = rules.map((rule, index) => {
    const threshold = Number(rule.threshold);
    if (!rule.name?.trim()) {
      return { error: `Payout rule #${index + 1}: name is required` };
    }
    if (Number.isNaN(threshold) || threshold < 0) {
      return { error: `Payout rule "${rule.name}": threshold must be non-negative` };
    }
    return {
      id: String(rule.id || `rule_${index + 1}`),
      name: String(rule.name).trim(),
      role: rule.role || null,
      threshold,
      active: Boolean(rule.active),
    };
  });

  const failed = cleanedRules.find((item) => item.error);
  if (failed) return { error: failed.error };

  return {
    payouts: {
      currency: payload.currency || "INR",
      minPayoutAmount,
      payoutSchedule: schedule,
      payoutDayOfMonth,
      holdDaysAfterActivation,
      autoApproveBelow,
      eligibleStatuses: Array.isArray(payload.eligibleStatuses)
        ? payload.eligibleStatuses.map(String)
        : defaultPayoutSettings().eligibleStatuses,
      rules: cleanedRules,
    },
  };
}

export async function getAdminSettings(_req, res) {
  try {
    const doc = await PlatformSettings.getOrCreate();
    return res.json({
      settings: PlatformSettings.sanitize(doc),
    });
  } catch (error) {
    console.error("Get admin settings error:", error);
    return res.status(500).json({ message: "Failed to fetch system settings" });
  }
}

export async function getAdminFeeSettings(_req, res) {
  try {
    const doc = await PlatformSettings.getOrCreate();
    const settings = PlatformSettings.sanitize(doc);
    return res.json({
      fees: settings.fees,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Get fee settings error:", error);
    return res.status(500).json({ message: "Failed to fetch fee structures" });
  }
}

/** FR-MA-01 */
export async function updateAdminFeeSettings(req, res) {
  try {
    const parsed = sanitizeFeeStructures(req.body.structures ?? req.body.fees?.structures);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const fees = {
      ...defaultFeeSettings(),
      currency: req.body.currency || req.body.fees?.currency || "INR",
      structures: parsed.structures,
    };

    const result = await PlatformSettings.updateSection("fees", fees, req.user);
    const settings = PlatformSettings.sanitize(result.updated);

    return res.json({
      message: "Platform fee structures updated successfully",
      fees: settings.fees,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Update fee settings error:", error);
    return res.status(500).json({ message: "Failed to update fee structures" });
  }
}

export async function getAdminPermissionSettings(_req, res) {
  try {
    const doc = await PlatformSettings.getOrCreate();
    const settings = PlatformSettings.sanitize(doc);
    return res.json({
      permissions: settings.permissions,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Get permission settings error:", error);
    return res.status(500).json({ message: "Failed to fetch access rights" });
  }
}

/** FR-MA-02 */
export async function updateAdminPermissionSettings(req, res) {
  try {
    const rolesInput = req.body.roles ?? req.body.permissions?.roles;
    const parsed = sanitizePermissions(rolesInput);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const defaults = defaultPermissionSettings();
    const permissions = {
      ...defaults,
      roles: parsed.roles,
    };

    const result = await PlatformSettings.updateSection(
      "permissions",
      permissions,
      req.user,
    );
    const settings = PlatformSettings.sanitize(result.updated);

    return res.json({
      message: "User access rights updated successfully",
      permissions: settings.permissions,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Update permission settings error:", error);
    return res.status(500).json({ message: "Failed to update access rights" });
  }
}

export async function getAdminPayoutSettings(_req, res) {
  try {
    const doc = await PlatformSettings.getOrCreate();
    const settings = PlatformSettings.sanitize(doc);
    return res.json({
      payouts: settings.payouts,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Get payout settings error:", error);
    return res.status(500).json({ message: "Failed to fetch payout rules" });
  }
}

/** FR-MA-03 */
export async function updateAdminPayoutSettings(req, res) {
  try {
    const payload = req.body.payouts || req.body;
    const parsed = sanitizePayouts(payload);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const result = await PlatformSettings.updateSection(
      "payouts",
      parsed.payouts,
      req.user,
    );
    const settings = PlatformSettings.sanitize(result.updated);

    return res.json({
      message: "Payout rules and thresholds updated successfully",
      payouts: settings.payouts,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
  } catch (error) {
    console.error("Update payout settings error:", error);
    return res.status(500).json({ message: "Failed to update payout rules" });
  }
}
