import { getDb } from "../mongo.js";
import { defaultMdrSettings } from "../constants/mdrSettings.js";
import {
  PLATFORM_SETTINGS_DOC_ID,
  defaultPlatformSettings,
} from "../constants/platformSettings.js";

const COLLECTION = "platform_settings";

function settings() {
  return getDb().collection(COLLECTION);
}

function mergeDefaults(doc = {}) {
  const defaults = defaultPlatformSettings();
  const mdrDefaults = defaultMdrSettings();
  return {
    ...defaults,
    ...doc,
    fees: {
      ...defaults.fees,
      ...(doc.fees || {}),
      structures: Array.isArray(doc.fees?.structures)
        ? doc.fees.structures
        : defaults.fees.structures,
    },
    permissions: {
      ...defaults.permissions,
      ...(doc.permissions || {}),
      roles: Array.isArray(doc.permissions?.roles)
        ? doc.permissions.roles
        : defaults.permissions.roles,
      availablePermissions: defaults.permissions.availablePermissions,
      allPermissionKeys: defaults.permissions.allPermissionKeys,
    },
    payouts: {
      ...defaults.payouts,
      ...(doc.payouts || {}),
      rules: Array.isArray(doc.payouts?.rules)
        ? doc.payouts.rules
        : defaults.payouts.rules,
      eligibleStatuses: Array.isArray(doc.payouts?.eligibleStatuses)
        ? doc.payouts.eligibleStatuses
        : defaults.payouts.eligibleStatuses,
    },
    mdr: {
      ...mdrDefaults,
      ...(doc.mdr || {}),
      globalRates: Array.isArray(doc.mdr?.globalRates)
        ? doc.mdr.globalRates
        : mdrDefaults.globalRates,
      tiers: Array.isArray(doc.mdr?.tiers) ? doc.mdr.tiers : mdrDefaults.tiers,
    },
  };
}

export const PlatformSettings = {
  async getOrCreate() {
    const existing = await settings().findOne({ _id: PLATFORM_SETTINGS_DOC_ID });
    if (existing) {
      return mergeDefaults(existing);
    }

    const defaults = defaultPlatformSettings();
    const now = new Date();
    const doc = {
      _id: PLATFORM_SETTINGS_DOC_ID,
      ...defaults,
      createdAt: now,
      updatedAt: now,
      updatedBy: null,
    };

    await settings().insertOne(doc);
    return mergeDefaults(doc);
  },

  async updateSection(section, data, actor = null) {
    const allowed = ["fees", "permissions", "payouts", "mdr"];
    if (!allowed.includes(section)) {
      return { invalid: true, updated: null };
    }

    const current = await this.getOrCreate();
    const nextSection =
      section === "permissions"
        ? {
            ...current.permissions,
            ...data,
            availablePermissions: current.permissions.availablePermissions,
            allPermissionKeys: current.permissions.allPermissionKeys,
            roles: Array.isArray(data.roles) ? data.roles : current.permissions.roles,
          }
        : section === "mdr"
          ? {
              ...current.mdr,
              ...data,
              globalRates: Array.isArray(data.globalRates)
                ? data.globalRates
                : current.mdr.globalRates,
              tiers: Array.isArray(data.tiers) ? data.tiers : current.mdr.tiers,
            }
          : {
              ...current[section],
              ...data,
            };

    const updates = {
      [section]: nextSection,
      updatedAt: new Date(),
      updatedBy: actor
        ? {
            id: actor._id?.toString?.() ?? actor.id ?? null,
            name: actor.name ?? null,
            email: actor.email ?? null,
            role: actor.role ?? null,
          }
        : current.updatedBy ?? null,
    };

    const result = await settings().findOneAndUpdate(
      { _id: PLATFORM_SETTINGS_DOC_ID },
      { $set: updates },
      { returnDocument: "after", upsert: true },
    );

    return { invalid: false, updated: mergeDefaults(result) };
  },

  sanitize(doc) {
    const merged = mergeDefaults(doc || {});
    return {
      id: PLATFORM_SETTINGS_DOC_ID,
      fees: merged.fees,
      permissions: merged.permissions,
      payouts: merged.payouts,
      mdr: merged.mdr,
      updatedAt: doc?.updatedAt ?? null,
      updatedBy: doc?.updatedBy ?? null,
      createdAt: doc?.createdAt ?? null,
    };
  },
};
