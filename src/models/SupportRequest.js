import { getDb } from "../mongo.js";

const COLLECTION = "support_requests";

function requests() {
  return getDb().collection(COLLECTION);
}

export const SupportRequest = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await requests().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  sanitize(request) {
    return {
      id: request._id.toString(),
      businessName: request.businessName,
      contactNumber: request.contactNumber,
      businessEmail: request.businessEmail,
      website: request.website ?? null,
      paymentGateway: request.paymentGateway,
      issueCategory: request.issueCategory,
      issueDescription: request.issueDescription,
      disclaimerAccepted: request.disclaimerAccepted,
      attachments: request.attachments ?? [],
      createdAt: request.createdAt,
    };
  },
};
