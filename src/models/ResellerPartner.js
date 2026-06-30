import { getDb } from "../mongo.js";

const COLLECTION = "reseller_partners";

function partners() {
  return getDb().collection(COLLECTION);
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

  sanitize(partner) {
    return {
      id: partner._id.toString(),
      fullName: partner.fullName,
      businessName: partner.businessName,
      email: partner.email,
      phone: partner.phone,
      website: partner.website || "",
      partnerType: partner.partnerType,
      businessTypes: partner.businessTypes,
      monthlyBusinessCount: partner.monthlyBusinessCount,
      paymentFamiliarity: partner.paymentFamiliarity,
      createdAt: partner.createdAt,
    };
  },
};
