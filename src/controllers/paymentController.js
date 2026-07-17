import {
  PAYMENT_CAPABILITY_VALUES,
  PAYMENT_CAPABILITIES,
  PAYMENT_PARTNERSHIP_GOAL_VALUES,
  PAYMENT_PARTNERSHIP_GOALS,
} from "../constants/paymentForm.js";
import { PG_VERIFICATION_STATUSES } from "../constants/paymentOnboarding.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { createUserFromForm } from "../services/formUserAccount.js";
import { enrichItemsWithAccountStatus, setUserAccountStatus } from "../services/accountStatus.js";
import {
  computePgOnboardingCompletion,
  resolvePgVerificationStatus,
  sanitizeOnboardingPayload,
} from "../utils/pgOnboarding.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";
import {
  getPrimaryPgExpert,
  normalizePgExperts,
  resolvePgExperts,
} from "../utils/pgExperts.js";

function normalizeAdminFileMeta(file) {
  if (!file || typeof file !== "object") return null;
  if (!file.key && !file.url && !file.fileName) return null;
  return {
    key: file.key || null,
    url: file.url || null,
    fileName: file.fileName || null,
    mimeType: file.mimeType || null,
    size: file.size || null,
  };
}

const PG_SELF_PROFILE_ONBOARDING_FIELDS = [
  "brandName",
  "legalEntityName",
  "companyLogo",
  "companyOverview",
  "websiteUrl",
];

const PG_SELF_CONFIG_FIELDS = [
  "upiMdr",
  "creditCardMdr",
  "debitCardMdr",
  "internationalMdr",
  "walletCharges",
  "netBankingCharges",
  "emiBnplCharges",
  "onboardingTat",
  "settlementCycle",
  "refundSla",
  "features",
  "suggestNewFeature",
];

function pickFields(source, allowedFields) {
  return Object.fromEntries(
    allowedFields
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );
}

/** Public: PGs with Talk to Expert enabled + nominated expert (for website form). */
export async function listTalkToExpertProviders(req, res) {
  try {
    const items = await PaymentProvider.findTalkToExpertProviders({
      search: req.query.search,
    });

    const paymentGateways = await Promise.all(
      items.map((item) => PaymentProvider.sanitizeTalkToExpert(item)),
    );

    return res.json({
      paymentGateways,
      total: items.length,
    });
  } catch (error) {
    console.error("List talk-to-expert providers error:", error);
    return res.status(500).json({ message: "Failed to fetch payment gateway experts" });
  }
}

export function getFormOptions(_req, res) {
  return res.json({
    title: "Let's Get Acquainted",
    steps: [
      {
        step: 1,
        label: "Organisation",
        fields: ["companyName", "contactPerson", "designation", "email", "phone", "website"],
      },
      {
        step: 2,
        label: "Capabilities",
        fields: ["paymentCapabilities"],
      },
      {
        step: 3,
        label: "Partnership",
        fields: ["partnershipGoals", "consent"],
      },
    ],
    paymentCapabilities: PAYMENT_CAPABILITIES,
    partnershipGoals: PAYMENT_PARTNERSHIP_GOALS,
  });
}

export async function getAllPaymentGateways(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await PaymentProvider.findAll({ page, limit });
    const enrichedItems = await enrichItemsWithAccountStatus(result.items);

    return res.json({
      paymentGateways: enrichedItems.map(PaymentProvider.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Get payment gateways error:", error);
    return res.status(500).json({ message: "Failed to fetch payment gateways" });
  }
}

export async function getPaymentGatewayById(req, res) {
  try {
    const provider = await PaymentProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([provider]);

    return res.json({
      paymentGateway: PaymentProvider.sanitize(enriched),
    });
  } catch (error) {
    console.error("Get payment gateway error:", error);
    return res.status(500).json({ message: "Failed to fetch payment gateway" });
  }
}

export async function getMyPaymentProfile(req, res) {
  try {
    const provider = await PaymentProvider.findByUserId(req.userId);

    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([provider]);

    return res.json({
      paymentGateway: PaymentProvider.sanitize(enriched),
    });
  } catch (error) {
    console.error("Get my payment profile error:", error);
    return res.status(500).json({ message: "Failed to fetch payment gateway profile" });
  }
}

/** FR-PG-06 / FR-PG-07 — PG-managed internal advisors and Calendly availability. */
export async function getMyPgExperts(req, res) {
  try {
    const provider = await PaymentProvider.findByUserId(req.userId);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    return res.json({
      experts: resolvePgExperts(provider),
      total: resolvePgExperts(provider).length,
    });
  } catch (error) {
    console.error("Get my PG experts error:", error);
    return res.status(500).json({ message: "Failed to fetch PG experts" });
  }
}

export async function updateMyPgExperts(req, res) {
  try {
    const provider = await PaymentProvider.findByUserId(req.userId);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    if (!Array.isArray(req.body.experts)) {
      return res.status(400).json({ message: "experts must be an array" });
    }
    if (req.body.experts.length > 20) {
      return res.status(400).json({ message: "A maximum of 20 experts is supported" });
    }

    const experts = normalizePgExperts(req.body.experts).map((expert) => ({
      ...expert,
      mobile: getPhoneDigits(expert.mobile),
    }));

    for (let index = 0; index < experts.length; index += 1) {
      const expert = experts[index];
      const label = `Expert ${index + 1}`;
      if (!expert.name || !expert.email || !expert.mobile) {
        return res.status(400).json({
          message: `${label}: name, email, and mobile are required`,
        });
      }
      const emailError = validateEmail(expert.email);
      if (emailError) {
        return res.status(400).json({ message: `${label}: ${emailError}` });
      }
      const mobileError = validateMobilePhone(expert.mobile);
      if (mobileError) {
        return res.status(400).json({ message: `${label}: ${mobileError}` });
      }
      if (expert.calendlyUrl) {
        try {
          const url = new URL(expert.calendlyUrl);
          if (url.protocol !== "https:" || !url.hostname.endsWith("calendly.com")) {
            throw new Error("invalid Calendly URL");
          }
        } catch {
          return res.status(400).json({
            message: `${label}: enter a valid https://calendly.com scheduling URL`,
          });
        }
      }
    }

    const primary = experts.find(
      (expert) => expert.isPrimary && expert.status === "active",
    );
    const nextOnboarding = sanitizeOnboardingPayload(
      {
        ...(provider.onboarding || {}),
        experts,
        talkToExpertEnabled: Boolean(primary),
        expertName: primary?.name || "",
        expertDesignation: primary?.designation || "",
        expertEmail: primary?.email || "",
        expertMobile: primary?.mobile || "",
        expertDescription: primary?.description || "",
        calendlyUrl: primary?.calendlyUrl || "",
        calendarSynced: Boolean(primary?.calendlyUrl || primary?.calendarSynced),
        availabilitySlots: primary?.availabilitySlots || "",
      },
      { mergeWith: provider.onboarding || {} },
    );
    const result = await PaymentProvider.updateById(provider._id, {
      onboarding: nextOnboarding,
    });
    if (!result.updated) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    return res.json({
      message: "Internal experts and Calendly availability updated successfully",
      experts: resolvePgExperts(result.updated),
      primaryExpert: getPrimaryPgExpert(result.updated),
    });
  } catch (error) {
    console.error("Update my PG experts error:", error);
    return res.status(500).json({ message: "Failed to update PG experts" });
  }
}

export async function updateMyPaymentProfile(req, res) {
  try {
    const provider = await PaymentProvider.findByUserId(req.userId);

    if (!provider) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const { section, submit, onboarding: onboardingBody, ...flatFields } = req.body;
    const updates = {};

    if (section === "profile") {
      const source =
        onboardingBody && typeof onboardingBody === "object"
          ? { ...flatFields, ...onboardingBody }
          : flatFields;
      const companyName = String(source.companyName || "").trim();
      const contactPerson = String(source.contactPerson || "").trim();
      const email = String(source.email || "").trim().toLowerCase();
      const phone = String(source.phone || "").trim();

      if (!companyName || !contactPerson || !email || !phone) {
        return res.status(400).json({
          message: "Company name, contact person, email, and phone are required",
        });
      }

      const emailError = validateEmail(email);
      if (emailError) return res.status(400).json({ message: emailError });
      const phoneError = validateMobilePhone(phone);
      if (phoneError) return res.status(400).json({ message: phoneError });

      updates.companyName = companyName;
      updates.contactPerson = contactPerson;
      updates.designation = String(source.designation || "").trim();
      updates.email = email;
      updates.phone = getPhoneDigits(phone);
      updates.website = String(source.website || source.websiteUrl || "").trim();
      updates.onboarding = sanitizeOnboardingPayload(
        pickFields(source, PG_SELF_PROFILE_ONBOARDING_FIELDS),
        { mergeWith: provider.onboarding || {} },
      );
    } else if (section === "config") {
      const source =
        onboardingBody && typeof onboardingBody === "object"
          ? onboardingBody
          : flatFields;
      updates.onboarding = sanitizeOnboardingPayload(
        pickFields(source, PG_SELF_CONFIG_FIELDS),
        { mergeWith: provider.onboarding || {} },
      );
    } else if (section === "onboarding" || section === "draft" || section === "submit" || !section) {
      if (provider.verificationStatus === PG_VERIFICATION_STATUSES.APPROVED) {
        return res.status(400).json({
          message:
            "Approved onboarding cannot be resubmitted. Use Profile or Configuration management instead.",
        });
      }

      const incoming =
        onboardingBody && typeof onboardingBody === "object" ? onboardingBody : flatFields;

      const nextOnboarding = sanitizeOnboardingPayload(incoming, {
        mergeWith: provider.onboarding || {},
      });

      updates.onboarding = nextOnboarding;

      const profile = computePgOnboardingCompletion({ onboarding: nextOnboarding });
      const shouldSubmit = Boolean(submit) || section === "submit";

      if (shouldSubmit) {
        updates.verificationStatus = PG_VERIFICATION_STATUSES.PENDING_REVIEW;
        updates.onboardingSubmittedAt = new Date();
      } else {
        updates.verificationStatus = resolvePgVerificationStatus(
          { ...provider, onboarding: nextOnboarding },
          profile,
        );
      }
    } else {
      return res.status(400).json({ message: "Unsupported profile section" });
    }

    const result = await PaymentProvider.updateById(provider._id, updates);

    if (result.invalid || !result.updated) {
      return res.status(404).json({ message: "Payment gateway profile not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([result.updated]);
    const sanitized = PaymentProvider.sanitize(enriched);

    return res.json({
      message:
        section === "profile"
          ? "Payment gateway profile updated successfully"
          : section === "config"
            ? "MDR, TAT, and supported features updated successfully"
            : updates.verificationStatus === PG_VERIFICATION_STATUSES.PENDING_REVIEW
          ? "Onboarding submitted for review"
          : "Onboarding progress saved",
      paymentGateway: sanitized,
    });
  } catch (error) {
    console.error("Update my payment profile error:", error);
    return res.status(500).json({ message: "Failed to update payment gateway profile" });
  }
}

export async function deletePaymentGateway(req, res) {
  try {
    const result = await PaymentProvider.deleteById(req.params.id);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid payment gateway id" });
    }

    if (!result.deleted) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    return res.json({ message: "Payment gateway deleted successfully" });
  } catch (error) {
    console.error("Delete payment gateway error:", error);
    return res.status(500).json({ message: "Failed to delete payment gateway" });
  }
}

export async function submitPaymentForm(req, res) {
  try {
    const { companyName, contactPerson, designation, email, phone, website, password } = req.body;

    if (
      !companyName?.trim() ||
      !contactPerson?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Company name, contact person, email, phone, and password are required",
      });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const phoneError = validateMobilePhone(phone);
    if (phoneError) {
      return res.status(400).json({ message: phoneError });
    }

    const userResult = await createUserFromForm({
      name: contactPerson.trim(),
      email,
      password,
      role: "payment_provider",
    });

    if (userResult.message) {
      return res.status(userResult.status).json({ message: userResult.message });
    }

    const provider = await PaymentProvider.create({
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      designation: designation?.trim() || "Not specified",
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      paymentCapabilities: [],
      partnershipGoals: [],
      consent: false,
      source: "payment",
      userId: userResult.user._id,
      formStep: 1,
      onboarding: {
        brandName: companyName.trim(),
        legalEntityName: companyName.trim(),
        websiteUrl: website?.trim() || "",
      },
      verificationStatus: "incomplete",
    });

    const sanitized = PaymentProvider.sanitize({
      ...provider,
      accountStatus: userResult.user.status ?? "inactive",
    });

    return res.status(201).json({
      id: sanitized.id,
      message: "Step 1 saved successfully",
      provider: sanitized,
    });
  } catch (error) {
    console.error("Payment form error:", error);
    return res.status(500).json({ message: "Failed to submit partnership inquiry" });
  }
}

export async function updatePaymentForm(req, res) {
  try {
    const provider = await PaymentProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const {
      companyName,
      contactPerson,
      designation,
      email,
      phone,
      website,
      paymentCapabilities,
      partnershipGoals,
      consent,
      step,
    } = req.body;

    const updates = {};
    const formStep = Number(step);

    if (formStep === 1) {
      if (
        !companyName?.trim() ||
        !contactPerson?.trim() ||
        !email?.trim() ||
        !phone?.trim()
      ) {
        return res.status(400).json({
          message: "Company name, contact person, email, and phone are required",
        });
      }

      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }

      const phoneError = validateMobilePhone(phone);
      if (phoneError) {
        return res.status(400).json({ message: phoneError });
      }

      updates.companyName = companyName.trim();
      updates.contactPerson = contactPerson.trim();
      updates.designation = designation?.trim() || provider.designation || "Not specified";
      updates.email = email.trim().toLowerCase();
      updates.phone = getPhoneDigits(phone);
      updates.website = website?.trim() || "";
      updates.formStep = Math.max(provider.formStep ?? 1, 1);
    } else if (formStep === 2) {
      if (!Array.isArray(paymentCapabilities) || paymentCapabilities.length === 0) {
        return res.status(400).json({ message: "At least one payment capability is required" });
      }

      const invalidCapability = paymentCapabilities.find(
        (value) => !PAYMENT_CAPABILITY_VALUES.includes(value),
      );
      if (invalidCapability) {
        return res.status(400).json({ message: "Invalid payment capability value" });
      }

      updates.paymentCapabilities = paymentCapabilities;
      updates.formStep = Math.max(provider.formStep ?? 1, 2);
    } else if (formStep === 3) {
      if (!Array.isArray(partnershipGoals) || partnershipGoals.length === 0) {
        return res.status(400).json({ message: "At least one partnership goal is required" });
      }

      const invalidGoal = partnershipGoals.find(
        (value) => !PAYMENT_PARTNERSHIP_GOAL_VALUES.includes(value),
      );
      if (invalidGoal) {
        return res.status(400).json({ message: "Invalid partnership goal value" });
      }

      if (!consent) {
        return res.status(400).json({ message: "Consent is required" });
      }

      updates.partnershipGoals = partnershipGoals;
      updates.consent = true;
      updates.formStep = 3;
    } else {
      return res.status(400).json({ message: "A valid form step is required" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const result = await PaymentProvider.updateById(req.params.id, updates);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid payment gateway id" });
    }

    if (!result.updated) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const isComplete = Boolean(
      result.updated.paymentCapabilities?.length &&
        result.updated.partnershipGoals?.length &&
        result.updated.consent,
    );
    const sanitized = PaymentProvider.sanitize(result.updated);

    return res.json({
      id: sanitized.id,
      message: isComplete
        ? "Your partnership inquiry has been submitted successfully. You can sign in once an admin activates your account."
        : "Progress saved successfully",
      provider: sanitized,
      completed: isComplete,
    });
  } catch (error) {
    console.error("Update payment form error:", error);
    return res.status(500).json({ message: "Failed to update partnership inquiry" });
  }
}

export async function updatePaymentAccountStatus(req, res) {
  try {
    const provider = await PaymentProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const result = await setUserAccountStatus(provider.userId, req.body.status);

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      message: `Account ${result.accountStatus === "active" ? "activated" : "deactivated"} successfully`,
      accountStatus: result.accountStatus,
    });
  } catch (error) {
    console.error("Update payment account status error:", error);
    return res.status(500).json({ message: "Failed to update account status" });
  }
}

/** FR-MA-04 / FR-MA-06 — Master Admin onboard Payment Gateway with optional documents */
export async function adminOnboardPaymentGateway(req, res) {
  try {
    const {
      companyName,
      contactPerson,
      designation,
      email,
      phone,
      website,
      password,
      companyLogo,
      onboardingChecklist,
      accountStatus = "active",
      verificationStatus = PG_VERIFICATION_STATUSES.PENDING_REVIEW,
      activateAccount = true,
    } = req.body;

    if (
      !companyName?.trim() ||
      !contactPerson?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Company name, contact person, email, phone, and password are required",
      });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const phoneError = validateMobilePhone(phone);
    if (phoneError) {
      return res.status(400).json({ message: phoneError });
    }

    const allowedVerification = Object.values(PG_VERIFICATION_STATUSES);
    if (!allowedVerification.includes(verificationStatus)) {
      return res.status(400).json({
        message: `verificationStatus must be one of: ${allowedVerification.join(", ")}`,
      });
    }

    const userResult = await createUserFromForm({
      name: contactPerson.trim(),
      email,
      password,
      role: "payment_provider",
      status: activateAccount || accountStatus === "active" ? "active" : "inactive",
    });

    if (userResult.message) {
      return res.status(userResult.status).json({ message: userResult.message });
    }

    const onboarding = sanitizeOnboardingPayload({
      brandName: companyName.trim(),
      legalEntityName: companyName.trim(),
      websiteUrl: website?.trim() || "",
      companyLogo: normalizeAdminFileMeta(companyLogo),
      onboardingChecklist: normalizeAdminFileMeta(onboardingChecklist),
    });

    const provider = await PaymentProvider.create({
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      designation: designation?.trim() || "Not specified",
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      paymentCapabilities: [],
      partnershipGoals: [],
      consent: true,
      source: "admin",
      userId: userResult.user._id,
      formStep: 1,
      onboarding,
      verificationStatus,
      onboardingSubmittedAt:
        verificationStatus === PG_VERIFICATION_STATUSES.PENDING_REVIEW ||
        verificationStatus === PG_VERIFICATION_STATUSES.APPROVED
          ? new Date()
          : null,
    });

    const sanitized = PaymentProvider.sanitize({
      ...provider,
      accountStatus: userResult.user.status ?? "active",
    });

    return res.status(201).json({
      id: sanitized.id,
      message: "Payment gateway onboarded successfully",
      paymentGateway: sanitized,
    });
  } catch (error) {
    console.error("Admin onboard payment gateway error:", error);
    return res.status(500).json({ message: "Failed to onboard payment gateway" });
  }
}

/** FR-MA-06 — update onboarding documents on an existing PG */
export async function updatePaymentOnboardingDocuments(req, res) {
  try {
    const provider = await PaymentProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const { companyLogo, onboardingChecklist } = req.body;
    const nextOnboarding = sanitizeOnboardingPayload(
      {
        companyLogo:
          companyLogo === undefined
            ? provider.onboarding?.companyLogo
            : normalizeAdminFileMeta(companyLogo),
        onboardingChecklist:
          onboardingChecklist === undefined
            ? provider.onboarding?.onboardingChecklist
            : normalizeAdminFileMeta(onboardingChecklist),
      },
      { mergeWith: provider.onboarding || {} },
    );

    const result = await PaymentProvider.updateById(provider._id, {
      onboarding: nextOnboarding,
    });

    if (!result.updated) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([result.updated]);

    return res.json({
      message: "Onboarding documents updated",
      paymentGateway: PaymentProvider.sanitize(enriched),
    });
  } catch (error) {
    console.error("Update payment documents error:", error);
    return res.status(500).json({ message: "Failed to update onboarding documents" });
  }
}

/** FR-MA-04 / FR-MA-06 — verify PG onboarding */
export async function updatePaymentVerificationStatus(req, res) {
  try {
    const provider = await PaymentProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const { status } = req.body;
    const allowed = [
      PG_VERIFICATION_STATUSES.PENDING_REVIEW,
      PG_VERIFICATION_STATUSES.APPROVED,
      PG_VERIFICATION_STATUSES.REJECTED,
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Status must be pending_review, approved, or rejected",
      });
    }

    const result = await PaymentProvider.updateById(provider._id, {
      verificationStatus: status,
      onboardingSubmittedAt:
        provider.onboardingSubmittedAt ||
        (status === PG_VERIFICATION_STATUSES.PENDING_REVIEW ||
        status === PG_VERIFICATION_STATUSES.APPROVED
          ? new Date()
          : null),
    });

    if (!result.updated) {
      return res.status(404).json({ message: "Payment gateway not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([result.updated]);

    return res.json({
      message: `Verification marked as ${status.replaceAll("_", " ")}`,
      paymentGateway: PaymentProvider.sanitize(enriched),
    });
  } catch (error) {
    console.error("Update payment verification error:", error);
    return res.status(500).json({ message: "Failed to update verification status" });
  }
}
