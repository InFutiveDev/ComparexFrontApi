import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "reviews";

function reviews() {
  return getDb().collection(COLLECTION);
}

export const Review = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await reviews().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      reviews()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      reviews().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async getPublishedRatingSummaries() {
    return reviews()
      .aggregate([
        {
          $match: {
            status: "published",
            rating: { $gte: 1, $lte: 5 },
          },
        },
        {
          $group: {
            _id: {
              productId: {
                $toLower: {
                  $convert: {
                    input: "$productId",
                    to: "string",
                    onError: "",
                    onNull: "",
                  },
                },
              },
              productName: {
                $toLower: {
                  $convert: {
                    input: "$productName",
                    to: "string",
                    onError: "",
                    onNull: "",
                  },
                },
              },
            },
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) return null;
    return reviews().findOne({ _id: objectId });
  },

  async updateById(id, data) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, updated: null };
    }

    const result = await reviews().findOneAndUpdate(
      { _id: objectId },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await reviews().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  sanitize(review) {
    return {
      id: review._id.toString(),
      productId: review.productId,
      productName: review.productName,
      productCompany: review.productCompany || "",
      productCategory: review.productCategory || "",
      identityMethod: review.identityMethod || null,
      name: review.name,
      businessName: review.businessName,
      email: review.email,
      jobTitle: review.jobTitle || "",
      jobTitleOther: review.jobTitleOther || "",
      monthlyVolume: review.monthlyVolume || null,
      website: review.website || "",
      usageDuration: review.usageDuration || null,
      rating: review.rating ?? 0,
      recommendNps: review.recommendNps ?? null,
      ratings: review.ratings ?? {},
      title: review.title,
      reviewText: review.reviewText,
      stoodOut: review.stoodOut ?? [],
      idealFor: review.idealFor ?? [],
      onboardingExperience: review.onboardingExperience || "",
      businessTypesBenefit: review.businessTypesBenefit || "",
      businessTypesOther: review.businessTypesOther || "",
      doesWell: review.doesWell || "",
      consents: review.consents ?? {},
      shareOnLinkedIn: Boolean(review.shareOnLinkedIn),
      status: review.status ?? "pending",
      source: review.source ?? "write-a-review",
      createdAt: review.createdAt,
      updatedAt: review.updatedAt ?? null,
    };
  },
};
