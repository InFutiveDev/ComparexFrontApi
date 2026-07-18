import { REVIEW_IDENTITY_METHODS, REVIEW_STATUSES } from "../constants/reviewForm.js";
import { Review } from "../models/Review.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { validateEmail } from "../utils/validation.js";

function toNumberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildRatings(body = {}) {
  return {
    onboardingRating: toNumberOrZero(body.onboardingRating),
    supportRating: toNumberOrZero(body.supportRating),
    pricingRating: toNumberOrZero(body.pricingRating),
    dashboardRating: toNumberOrZero(body.dashboardRating),
    apiRating: toNumberOrZero(body.apiRating),
    reliabilityRating: toNumberOrZero(body.reliabilityRating),
    refundRating: toNumberOrZero(body.refundRating),
    settlementRating: toNumberOrZero(body.settlementRating),
    internationalRating: toNumberOrZero(body.internationalRating),
    deviceQuality: toNumberOrZero(body.deviceQuality),
    installationExperience: toNumberOrZero(body.installationExperience),
    soundboxReliability: toNumberOrZero(body.soundboxReliability),
    fieldSupport: toNumberOrZero(body.fieldSupport),
    fxTransparency: toNumberOrZero(body.fxTransparency),
    intlSettlementSpeed: toNumberOrZero(body.intlSettlementSpeed),
    exportDocSupport: toNumberOrZero(body.exportDocSupport),
    retryLogic: toNumberOrZero(body.retryLogic),
    subscriptionAnalytics: toNumberOrZero(body.subscriptionAnalytics),
    dunningExperience: toNumberOrZero(body.dunningExperience),
    verificationAccuracy: toNumberOrZero(body.verificationAccuracy),
    fraudDetection: toNumberOrZero(body.fraudDetection),
    apiResponseTime: toNumberOrZero(body.apiResponseTime),
  };
}

export async function getAllReviews(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await Review.findAll({ page, limit });

    return res.json({
      reviews: result.items.map(Review.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
}

export async function getReviewById(req, res) {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json({
      review: Review.sanitize(review),
    });
  } catch (error) {
    console.error("Get review error:", error);
    return res.status(500).json({ message: "Failed to fetch review" });
  }
}

export async function submitReview(req, res) {
  try {
    const body = req.body || {};
    const {
      productId,
      productName,
      productCompany,
      productCategory,
      identityMethod,
      name,
      businessName,
      email,
      jobTitle,
      jobTitleOther,
      monthlyVolume,
      website,
      usageDuration,
      rating,
      recommendNps,
      title,
      reviewText,
      stoodOut,
      idealFor,
      onboardingExperience,
      businessTypesBenefit,
      businessTypesOther,
      doesWell,
      consentGenuine,
      consentGuidelines,
      consentModeration,
      shareOnLinkedIn,
    } = body;

    if (
      !productId?.trim() ||
      !productName?.trim() ||
      !name?.trim() ||
      !businessName?.trim() ||
      !email?.trim() ||
      !title?.trim() ||
      !reviewText?.trim()
    ) {
      return res.status(400).json({
        message:
          "Provider, name, business name, email, review title, and review text are required",
      });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    if (identityMethod && !REVIEW_IDENTITY_METHODS.includes(identityMethod)) {
      return res.status(400).json({ message: "Invalid identity method" });
    }

    const overallRating = toNumberOrZero(rating);
    if (overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ message: "Overall rating must be between 1 and 5" });
    }

    if (recommendNps === null || recommendNps === undefined || recommendNps === "") {
      return res.status(400).json({ message: "Recommendation score (NPS) is required" });
    }

    const nps = toNumberOrZero(recommendNps);
    if (nps < 0 || nps > 10) {
      return res.status(400).json({ message: "Recommendation score must be between 0 and 10" });
    }

    if (!consentGenuine || !consentGuidelines || !consentModeration) {
      return res.status(400).json({ message: "All consent checkboxes are required" });
    }

    const resolvedJobTitle =
      jobTitle === "Others" ? String(jobTitleOther || "").trim() || "Others" : jobTitle || "";

    const review = await Review.create({
      productId: productId.trim(),
      productName: productName.trim(),
      productCompany: productCompany?.trim() || "",
      productCategory: productCategory?.trim() || "",
      identityMethod: identityMethod || null,
      name: name.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      jobTitle: resolvedJobTitle,
      jobTitleOther: jobTitle === "Others" ? String(jobTitleOther || "").trim() : "",
      monthlyVolume: monthlyVolume || null,
      website: website?.trim() || "",
      usageDuration: usageDuration || null,
      rating: overallRating,
      recommendNps: nps,
      ratings: buildRatings(body),
      title: title.trim(),
      reviewText: reviewText.trim(),
      stoodOut: Array.isArray(stoodOut) ? stoodOut : [],
      idealFor: Array.isArray(idealFor) ? idealFor : [],
      onboardingExperience: onboardingExperience || "",
      businessTypesBenefit: businessTypesBenefit || "",
      businessTypesOther: businessTypesOther?.trim() || "",
      doesWell: doesWell?.trim() || "",
      consents: {
        genuine: Boolean(consentGenuine),
        guidelines: Boolean(consentGuidelines),
        moderation: Boolean(consentModeration),
      },
      shareOnLinkedIn: Boolean(shareOnLinkedIn),
      status: "pending",
      source: "write-a-review",
    });

    return res.status(201).json({
      id: review._id.toString(),
      message: "Thank you! Your review has been submitted for moderation.",
      review: Review.sanitize(review),
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return res.status(500).json({ message: "Failed to submit review" });
  }
}

/** FR-MC-09 / FR-MC-11 — authenticated PG and platform ratings from Merchant Panel. */
export async function submitMerchantReview(req, res) {
  try {
    const {
      paymentProviderId,
      rating,
      platformRating,
      title,
      reviewText,
      businessName,
    } = req.body;

    if (
      !paymentProviderId?.trim() ||
      !title?.trim() ||
      !reviewText?.trim()
    ) {
      return res.status(400).json({
        message: "Payment gateway, review title, and review text are required",
      });
    }

    const pgRating = Number(rating);
    const overallPlatformRating = Number(platformRating);
    if (!Number.isInteger(pgRating) || pgRating < 1 || pgRating > 5) {
      return res.status(400).json({ message: "PG rating must be between 1 and 5" });
    }
    if (
      !Number.isInteger(overallPlatformRating) ||
      overallPlatformRating < 1 ||
      overallPlatformRating > 5
    ) {
      return res.status(400).json({
        message: "Platform experience rating must be between 1 and 5",
      });
    }
    if (reviewText.trim().length < 10) {
      return res.status(400).json({
        message: "Review text must contain at least 10 characters",
      });
    }

    const provider = await PaymentProvider.findById(paymentProviderId);
    if (!provider) {
      return res.status(400).json({ message: "Selected payment gateway is unavailable" });
    }
    const productName =
      provider.onboarding?.brandName || provider.companyName || "Payment Gateway";

    const review = await Review.create({
      paymentProviderId: provider._id,
      productId: provider._id.toString(),
      productName,
      productCompany: provider.companyName || productName,
      productCategory: "payment-gateway",
      identityMethod: "account",
      name: req.user.name || "Merchant",
      businessName: String(businessName || req.user.name || "").trim(),
      email: req.user.email,
      rating: pgRating,
      platformRating: overallPlatformRating,
      title: title.trim(),
      reviewText: reviewText.trim(),
      merchantUserId: req.user._id,
      reviewType: "pg_and_platform_review",
      status: "pending",
      source: "merchant-panel",
      ratings: {},
      consents: {
        genuine: true,
        guidelines: true,
        moderation: true,
      },
    });

    return res.status(201).json({
      id: review._id.toString(),
      message:
        "Thank you! Your ratings and review were submitted for moderation.",
      review: Review.sanitize(review),
    });
  } catch (error) {
    console.error("Submit merchant review error:", error);
    return res.status(500).json({ message: "Failed to submit merchant review" });
  }
}

export async function updateReviewStatus(req, res) {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const { status } = req.body;
    if (!REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${REVIEW_STATUSES.join(", ")}`,
      });
    }

    const result = await Review.updateById(review._id, { status });

    if (!result.updated) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json({
      message: `Review marked as ${status}`,
      review: Review.sanitize(result.updated),
    });
  } catch (error) {
    console.error("Update review status error:", error);
    return res.status(500).json({ message: "Failed to update review status" });
  }
}

export async function deleteReview(req, res) {
  try {
    const result = await Review.deleteById(req.params.id);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    if (!result.deleted) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ message: "Failed to delete review" });
  }
}
