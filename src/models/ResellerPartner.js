import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";
import {
  computeResellerProfileCompletion,
  resolveVerificationStatus,
} from "../utils/resellerProfile.js";
import { RESELLER_VERIFICATION_STATUSES } from "../constants/resellerForm.js";

const COLLECTION = "reseller_partners";

function partners() {
  return getDb().collection(COLLECTION);
}

function sanitizeFile(file) {
  if (!file || typeof file !== "object") return null;
  return {
    key: file.key || null,
    url: file.url || null,
    fileName: file.fileName || null,
    mimeType: file.mimeType || null,
    size: file.size || null,
  };
}

export const ResellerPartner = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await partners().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      partners()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      partners().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await partners().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return null;
    }

    return partners().findOne({ _id: objectId });
  },

  findByUserId(userId) {
    const objectId = parseObjectId(userId);
    if (!objectId) {
      return null;
    }

    return partners().findOne({ userId: objectId });
  },

  async updateById(id, data) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, updated: null };
    }

    const updates = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await partners().findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  sanitize(partner) {
    const profileCompletion = computeResellerProfileCompletion(partner);
    const verificationStatus =
      partner.verificationStatus ||
      resolveVerificationStatus(partner, profileCompletion);

    return {
      id: partner._id.toString(),
      fullName: partner.fullName,
      businessName: partner.businessName,
      email: partner.email,
      phone: partner.phone,
      website: partner.website || "",
      partnerType: partner.partnerType ?? null,
      businessTypes: partner.businessTypes ?? [],
      monthlyBusinessCount: partner.monthlyBusinessCount ?? null,
      paymentFamiliarity: partner.paymentFamiliarity ?? null,
      consent: partner.consent ?? false,
      partnershipModel: partner.partnershipModel ?? null,
      cityState: partner.cityState ?? "",
      yearsExperience: partner.yearsExperience ?? null,
      merchantNetworkSize: partner.merchantNetworkSize ?? null,
      monthlyReferrals: partner.monthlyReferrals ?? null,
      panCard: partner.panCard ?? "",
      aadhaarId: partner.aadhaarId ?? "",
      gstCertificate: sanitizeFile(partner.gstCertificate),
      bankAccountHolderName: partner.bankAccountHolderName ?? "",
      bankName: partner.bankName ?? "",
      bankAccountNumber: partner.bankAccountNumber ?? "",
      bankIfsc: partner.bankIfsc ?? "",
      bankBranch: partner.bankBranch ?? "",
      bankAccountType: partner.bankAccountType ?? null,
      bankProof: sanitizeFile(partner.bankProof),
      resellerAgreement: Boolean(partner.resellerAgreement),
      commissionPolicy: Boolean(partner.commissionPolicy),
      verificationStatus,
      profileCompletionPercent: profileCompletion.percent,
      profileCompletion,
      formStep: partner.formStep ?? 1,
      source: partner.source ?? null,
      userId: partner.userId?.toString() ?? null,
      accountStatus: partner.accountStatus ?? "inactive",
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt ?? null,
    };
  },
};

export { RESELLER_VERIFICATION_STATUSES };
