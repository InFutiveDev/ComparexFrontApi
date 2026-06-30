import { getDb } from "../mongo.js";

const COLLECTION = "payment_providers";

function providers() {
  return getDb().collection(COLLECTION);
}

export const PaymentProvider = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await providers().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  sanitize(provider) {
    return {
      id: provider._id.toString(),
      companyName: provider.companyName,
      contactPerson: provider.contactPerson,
      designation: provider.designation,
      email: provider.email,
      phone: provider.phone,
      website: provider.website || "",
      paymentCapabilities: provider.paymentCapabilities,
      partnershipGoals: provider.partnershipGoals,
      createdAt: provider.createdAt,
    };
  },
};
