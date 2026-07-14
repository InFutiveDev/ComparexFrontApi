import {
  RESELLER_BANK_ACCOUNT_TYPE_VALUES,
  RESELLER_BANK_ACCOUNT_TYPES,
  RESELLER_BUSINESS_TYPE_VALUES,
  RESELLER_BUSINESS_TYPES,
  RESELLER_MERCHANT_NETWORK_SIZE_VALUES,
  RESELLER_MERCHANT_NETWORK_SIZES,
  RESELLER_MONTHLY_BUSINESS_COUNT_VALUES,
  RESELLER_MONTHLY_BUSINESS_COUNTS,
  RESELLER_MONTHLY_REFERRAL_VALUES,
  RESELLER_MONTHLY_REFERRALS,
  RESELLER_PARTNER_TYPE_VALUES,
  RESELLER_PARTNER_TYPES,
  RESELLER_PARTNERSHIP_MODEL_VALUES,
  RESELLER_PARTNERSHIP_MODELS,
  RESELLER_PAYMENT_FAMILIARITY,
  RESELLER_PAYMENT_FAMILIARITY_VALUES,
  RESELLER_VERIFICATION_STATUSES,
  RESELLER_YEARS_EXPERIENCE,
  RESELLER_YEARS_EXPERIENCE_VALUES,
} from "../constants/resellerForm.js";
import { ResellerPartner } from "../models/ResellerPartner.js";
import { createUserFromForm } from "../services/formUserAccount.js";
import { enrichItemsWithAccountStatus, setUserAccountStatus } from "../services/accountStatus.js";
import {
  computeResellerProfileCompletion,
  resolveVerificationStatus,
} from "../utils/resellerProfile.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";

function normalizeFileMeta(file) {
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

export function getFormOptions(_req, res) {
  return res.json({
    title: "Let's Build Your Partner Profile",
    steps: [
      {
        step: 1,
        label: "Partner profile",
        fields: ["fullName", "businessName", "phone", "email", "website", "password"],
      },
      {
        step: 2,
        label: "Business network",
        fields: ["businessTypes", "partnerType", "monthlyBusinessCount"],
      },
      {
        step: 3,
        label: "Partnership",
        fields: ["paymentFamiliarity", "consent"],
      },
    ],
    partnerTypes: RESELLER_PARTNER_TYPES,
    businessTypes: RESELLER_BUSINESS_TYPES,
    monthlyBusinessCounts: RESELLER_MONTHLY_BUSINESS_COUNTS,
    paymentFamiliarity: RESELLER_PAYMENT_FAMILIARITY,
    partnershipModels: RESELLER_PARTNERSHIP_MODELS,
    yearsExperience: RESELLER_YEARS_EXPERIENCE,
    merchantNetworkSizes: RESELLER_MERCHANT_NETWORK_SIZES,
    monthlyReferrals: RESELLER_MONTHLY_REFERRALS,
    bankAccountTypes: RESELLER_BANK_ACCOUNT_TYPES,
  });
}

export async function getAllResellers(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await ResellerPartner.findAll({ page, limit });
    const enrichedItems = await enrichItemsWithAccountStatus(result.items);

    return res.json({
      resellers: enrichedItems.map(ResellerPartner.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Get resellers error:", error);
    return res.status(500).json({ message: "Failed to fetch resellers" });
  }
}

export async function getResellerById(req, res) {
  try {
    const partner = await ResellerPartner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([partner]);

    return res.json({
      reseller: ResellerPartner.sanitize(enriched),
    });
  } catch (error) {
    console.error("Get reseller error:", error);
    return res.status(500).json({ message: "Failed to fetch reseller" });
  }
}

export async function getMyResellerProfile(req, res) {
  try {
    const partner = await ResellerPartner.findByUserId(req.userId);

    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([partner]);

    return res.json({
      reseller: ResellerPartner.sanitize(enriched),
    });
  } catch (error) {
    console.error("Get my reseller profile error:", error);
    return res.status(500).json({ message: "Failed to fetch reseller profile" });
  }
}

export async function updateMyResellerProfile(req, res) {
  try {
    const partner = await ResellerPartner.findByUserId(req.userId);

    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    if (partner.verificationStatus === RESELLER_VERIFICATION_STATUSES.APPROVED) {
      return res.status(400).json({
        message: "Your profile is already approved and cannot be edited",
      });
    }

    const {
      section,
      partnershipModel,
      cityState,
      yearsExperience,
      merchantNetworkSize,
      monthlyReferrals,
      panCard,
      aadhaarId,
      gstCertificate,
      bankAccountHolderName,
      bankName,
      bankAccountNumber,
      confirmBankAccountNumber,
      bankIfsc,
      bankBranch,
      bankAccountType,
      bankProof,
      resellerAgreement,
      commissionPolicy,
    } = req.body;

    const updates = {};

    if (section === "business" || !section) {
      if (partnershipModel !== undefined) {
        if (!RESELLER_PARTNERSHIP_MODEL_VALUES.includes(partnershipModel)) {
          return res.status(400).json({ message: "Invalid partnership model" });
        }
        updates.partnershipModel = partnershipModel;
      }

      if (cityState !== undefined) {
        if (!String(cityState).trim()) {
          return res.status(400).json({ message: "City & State is required" });
        }
        updates.cityState = String(cityState).trim();
      }

      if (yearsExperience !== undefined) {
        if (!RESELLER_YEARS_EXPERIENCE_VALUES.includes(yearsExperience)) {
          return res.status(400).json({ message: "Invalid years of experience" });
        }
        updates.yearsExperience = yearsExperience;
      }

      if (merchantNetworkSize !== undefined && merchantNetworkSize !== "") {
        if (!RESELLER_MERCHANT_NETWORK_SIZE_VALUES.includes(merchantNetworkSize)) {
          return res.status(400).json({ message: "Invalid merchant network size" });
        }
        updates.merchantNetworkSize = merchantNetworkSize;
      } else if (merchantNetworkSize === "") {
        updates.merchantNetworkSize = null;
      }

      if (monthlyReferrals !== undefined && monthlyReferrals !== "") {
        if (!RESELLER_MONTHLY_REFERRAL_VALUES.includes(monthlyReferrals)) {
          return res.status(400).json({ message: "Invalid monthly referrals value" });
        }
        updates.monthlyReferrals = monthlyReferrals;
      } else if (monthlyReferrals === "") {
        updates.monthlyReferrals = null;
      }
    }

    if (section === "kyc" || !section) {
      if (panCard !== undefined) {
        if (!String(panCard).trim()) {
          return res.status(400).json({ message: "PAN Card is required" });
        }
        updates.panCard = String(panCard).trim().toUpperCase();
      }

      if (aadhaarId !== undefined) {
        if (!String(aadhaarId).trim()) {
          return res.status(400).json({ message: "Aadhaar / Govt ID is required" });
        }
        updates.aadhaarId = String(aadhaarId).trim();
      }

      if (gstCertificate !== undefined) {
        updates.gstCertificate = normalizeFileMeta(gstCertificate);
      }

      if (bankAccountHolderName !== undefined) {
        updates.bankAccountHolderName = String(bankAccountHolderName || "").trim();
      }
      if (bankName !== undefined) {
        updates.bankName = String(bankName || "").trim();
      }
      if (bankAccountNumber !== undefined) {
        updates.bankAccountNumber = String(bankAccountNumber || "").trim();
      }
      if (bankIfsc !== undefined) {
        updates.bankIfsc = String(bankIfsc || "").trim().toUpperCase();
      }
      if (bankBranch !== undefined) {
        updates.bankBranch = String(bankBranch || "").trim();
      }
      if (bankAccountType !== undefined && bankAccountType !== "") {
        if (!RESELLER_BANK_ACCOUNT_TYPE_VALUES.includes(bankAccountType)) {
          return res.status(400).json({ message: "Invalid bank account type" });
        }
        updates.bankAccountType = bankAccountType;
      }
      if (bankProof !== undefined) {
        updates.bankProof = normalizeFileMeta(bankProof);
      }

      if (
        bankAccountNumber !== undefined &&
        confirmBankAccountNumber !== undefined &&
        String(bankAccountNumber).trim() !== String(confirmBankAccountNumber).trim()
      ) {
        return res.status(400).json({ message: "Bank account numbers do not match" });
      }

      if (section === "kyc") {
        const nextBank = {
          bankAccountHolderName:
            updates.bankAccountHolderName ?? partner.bankAccountHolderName,
          bankName: updates.bankName ?? partner.bankName,
          bankAccountNumber: updates.bankAccountNumber ?? partner.bankAccountNumber,
          bankIfsc: updates.bankIfsc ?? partner.bankIfsc,
          bankAccountType: updates.bankAccountType ?? partner.bankAccountType,
          bankProof: updates.bankProof ?? partner.bankProof,
          panCard: updates.panCard ?? partner.panCard,
          aadhaarId: updates.aadhaarId ?? partner.aadhaarId,
        };

        if (
          !nextBank.panCard?.trim() ||
          !nextBank.aadhaarId?.trim() ||
          !nextBank.bankAccountHolderName?.trim() ||
          !nextBank.bankName?.trim() ||
          !nextBank.bankAccountNumber?.trim() ||
          !nextBank.bankIfsc?.trim() ||
          !nextBank.bankAccountType ||
          !normalizeFileMeta(nextBank.bankProof)
        ) {
          return res.status(400).json({
            message:
              "PAN, Aadhaar/Govt ID, bank details, and cancelled cheque / bank proof are required",
          });
        }
      }
    }

    if (section === "agreements" || !section) {
      if (resellerAgreement !== undefined) {
        updates.resellerAgreement = Boolean(resellerAgreement);
      }
      if (commissionPolicy !== undefined) {
        updates.commissionPolicy = Boolean(commissionPolicy);
      }

      if (section === "agreements") {
        const nextAgreement =
          updates.resellerAgreement ?? partner.resellerAgreement;
        const nextPolicy = updates.commissionPolicy ?? partner.commissionPolicy;
        if (!nextAgreement || !nextPolicy) {
          return res.status(400).json({
            message: "Please agree to the Reseller Agreement and Commission Policy",
          });
        }
      }
    }

    if (section === "business") {
      const next = {
        partnershipModel: updates.partnershipModel ?? partner.partnershipModel,
        cityState: updates.cityState ?? partner.cityState,
        yearsExperience: updates.yearsExperience ?? partner.yearsExperience,
      };
      if (!next.partnershipModel || !next.cityState?.trim() || !next.yearsExperience) {
        return res.status(400).json({
          message: "Partnership model, city & state, and years of experience are required",
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const merged = { ...partner, ...updates };
    const profile = computeResellerProfileCompletion(merged);
    updates.verificationStatus = resolveVerificationStatus(merged, profile);
    updates.formStep = Math.max(partner.formStep ?? 1, profile.requiredComplete ? 4 : 2);

    const result = await ResellerPartner.updateById(partner._id, updates);

    if (result.invalid || !result.updated) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([result.updated]);
    const sanitized = ResellerPartner.sanitize(enriched);

    return res.json({
      message: sanitized.profileCompletion.requiredComplete
        ? "Profile submitted for admin verification"
        : "Profile progress saved successfully",
      reseller: sanitized,
    });
  } catch (error) {
    console.error("Update my reseller profile error:", error);
    return res.status(500).json({ message: "Failed to update reseller profile" });
  }
}

export async function deleteReseller(req, res) {
  try {
    const result = await ResellerPartner.deleteById(req.params.id);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid reseller id" });
    }

    if (!result.deleted) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    return res.json({ message: "Reseller deleted successfully" });
  } catch (error) {
    console.error("Delete reseller error:", error);
    return res.status(500).json({ message: "Failed to delete reseller" });
  }
}

export async function submitResellerForm(req, res) {
  try {
    const { fullName, businessName, phone, email, website, password } = req.body;

    if (!fullName?.trim() || !businessName?.trim() || !phone?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Full name, business name, phone, email, and password are required",
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
      name: fullName.trim(),
      email,
      password,
      role: "reseller",
      status: "active",
    });

    if (userResult.message) {
      return res.status(userResult.status).json({ message: userResult.message });
    }

    const partner = await ResellerPartner.create({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      partnerType: null,
      businessTypes: [],
      monthlyBusinessCount: null,
      paymentFamiliarity: null,
      consent: false,
      partnershipModel: null,
      cityState: "",
      yearsExperience: null,
      merchantNetworkSize: null,
      monthlyReferrals: null,
      panCard: "",
      aadhaarId: "",
      gstCertificate: null,
      bankAccountHolderName: "",
      bankName: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankBranch: "",
      bankAccountType: null,
      bankProof: null,
      resellerAgreement: false,
      commissionPolicy: false,
      verificationStatus: RESELLER_VERIFICATION_STATUSES.INCOMPLETE,
      source: "reseller",
      userId: userResult.user._id,
      formStep: 1,
    });

    const sanitized = ResellerPartner.sanitize({
      ...partner,
      accountStatus: userResult.user.status ?? "active",
    });

    return res.status(201).json({
      id: sanitized.id,
      message: "Step 1 saved successfully",
      partner: sanitized,
    });
  } catch (error) {
    console.error("Reseller form error:", error);
    return res.status(500).json({ message: "Failed to submit partner application" });
  }
}

export async function updateResellerForm(req, res) {
  try {
    const partner = await ResellerPartner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const updates = {};
    const formStep = Number(req.body.step);

    if (formStep === 1) {
      const { fullName, businessName, phone, email, website } = req.body;

      if (!fullName?.trim() || !businessName?.trim() || !phone?.trim() || !email?.trim()) {
        return res.status(400).json({
          message: "Full name, business name, phone, and email are required",
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

      updates.fullName = fullName.trim();
      updates.businessName = businessName.trim();
      updates.email = email.trim().toLowerCase();
      updates.phone = getPhoneDigits(phone);
      updates.website = website?.trim() || "";
      updates.formStep = Math.max(partner.formStep ?? 1, 1);
    } else if (formStep === 2) {
      const { partnerType, businessTypes, monthlyBusinessCount } = req.body;

      if (!partnerType || !RESELLER_PARTNER_TYPE_VALUES.includes(partnerType)) {
        return res.status(400).json({ message: "Valid partner type is required" });
      }

      if (!Array.isArray(businessTypes) || businessTypes.length === 0) {
        return res.status(400).json({ message: "At least one business type is required" });
      }

      const invalidBusinessType = businessTypes.find(
        (value) => !RESELLER_BUSINESS_TYPE_VALUES.includes(value),
      );
      if (invalidBusinessType) {
        return res.status(400).json({ message: "Invalid business type value" });
      }

      if (
        !monthlyBusinessCount ||
        !RESELLER_MONTHLY_BUSINESS_COUNT_VALUES.includes(monthlyBusinessCount)
      ) {
        return res.status(400).json({ message: "Valid monthly business count is required" });
      }

      updates.partnerType = partnerType;
      updates.businessTypes = businessTypes;
      updates.monthlyBusinessCount = monthlyBusinessCount;
      updates.formStep = Math.max(partner.formStep ?? 1, 2);
    } else if (formStep === 3) {
      const { paymentFamiliarity, consent } = req.body;

      if (
        !paymentFamiliarity ||
        !RESELLER_PAYMENT_FAMILIARITY_VALUES.includes(paymentFamiliarity)
      ) {
        return res.status(400).json({ message: "Valid payment familiarity is required" });
      }

      if (!consent) {
        return res.status(400).json({ message: "Consent is required" });
      }

      updates.paymentFamiliarity = paymentFamiliarity;
      updates.consent = true;
      updates.formStep = Math.max(partner.formStep ?? 1, 3);
    } else {
      return res.status(400).json({ message: "A valid form step is required" });
    }

    const result = await ResellerPartner.updateById(req.params.id, updates);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid reseller id" });
    }

    if (!result.updated) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const isComplete = Boolean(
      result.updated.partnerType &&
        result.updated.businessTypes?.length &&
        result.updated.monthlyBusinessCount &&
        result.updated.paymentFamiliarity &&
        result.updated.consent,
    );
    const sanitized = ResellerPartner.sanitize(result.updated);

    return res.json({
      id: sanitized.id,
      message: isComplete
        ? "Your partner application has been submitted successfully. Sign in to your dashboard to complete remaining registration details."
        : "Progress saved successfully",
      partner: sanitized,
      completed: isComplete,
    });
  } catch (error) {
    console.error("Update reseller form error:", error);
    return res.status(500).json({ message: "Failed to update partner application" });
  }
}

export async function updateResellerAccountStatus(req, res) {
  try {
    const partner = await ResellerPartner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const result = await setUserAccountStatus(partner.userId, req.body.status);

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      message: `Account ${result.accountStatus === "active" ? "activated" : "deactivated"} successfully`,
      accountStatus: result.accountStatus,
    });
  } catch (error) {
    console.error("Update reseller account status error:", error);
    return res.status(500).json({ message: "Failed to update account status" });
  }
}

export async function updateResellerVerificationStatus(req, res) {
  try {
    const partner = await ResellerPartner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const { status } = req.body;
    const allowed = [
      RESELLER_VERIFICATION_STATUSES.PENDING_REVIEW,
      RESELLER_VERIFICATION_STATUSES.APPROVED,
      RESELLER_VERIFICATION_STATUSES.REJECTED,
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Status must be pending_review, approved, or rejected",
      });
    }

    if (status === RESELLER_VERIFICATION_STATUSES.APPROVED) {
      const profile = computeResellerProfileCompletion(partner);
      if (!profile.requiredComplete) {
        return res.status(400).json({
          message: "Reseller must complete required profile fields before approval",
        });
      }
    }

    const result = await ResellerPartner.updateById(partner._id, {
      verificationStatus: status,
    });

    if (!result.updated) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([result.updated]);

    return res.json({
      message: `Verification marked as ${status.replaceAll("_", " ")}`,
      reseller: ResellerPartner.sanitize(enriched),
    });
  } catch (error) {
    console.error("Update reseller verification error:", error);
    return res.status(500).json({ message: "Failed to update verification status" });
  }
}

/** FR-MA-05 / FR-MA-06 — Master Admin onboard reseller with optional KYC documents */
export async function adminOnboardReseller(req, res) {
  try {
    const {
      fullName,
      businessName,
      phone,
      email,
      website,
      password,
      panCard,
      aadhaarId,
      gstCertificate,
      bankAccountHolderName,
      bankName,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      bankAccountType,
      bankProof,
      cityState,
      partnershipModel,
      yearsExperience,
      verificationStatus = RESELLER_VERIFICATION_STATUSES.PENDING_REVIEW,
      activateAccount = true,
    } = req.body;

    if (!fullName?.trim() || !businessName?.trim() || !phone?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Full name, business name, phone, email, and password are required",
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

    const allowedVerification = Object.values(RESELLER_VERIFICATION_STATUSES);
    if (!allowedVerification.includes(verificationStatus)) {
      return res.status(400).json({
        message: `verificationStatus must be one of: ${allowedVerification.join(", ")}`,
      });
    }

    if (partnershipModel && !RESELLER_PARTNERSHIP_MODEL_VALUES.includes(partnershipModel)) {
      return res.status(400).json({ message: "Invalid partnership model" });
    }
    if (yearsExperience && !RESELLER_YEARS_EXPERIENCE_VALUES.includes(yearsExperience)) {
      return res.status(400).json({ message: "Invalid years of experience" });
    }
    if (bankAccountType && !RESELLER_BANK_ACCOUNT_TYPE_VALUES.includes(bankAccountType)) {
      return res.status(400).json({ message: "Invalid bank account type" });
    }

    const userResult = await createUserFromForm({
      name: fullName.trim(),
      email,
      password,
      role: "reseller",
      status: activateAccount ? "active" : "inactive",
    });

    if (userResult.message) {
      return res.status(userResult.status).json({ message: userResult.message });
    }

    const partner = await ResellerPartner.create({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      partnerType: null,
      businessTypes: [],
      monthlyBusinessCount: null,
      paymentFamiliarity: null,
      consent: true,
      partnershipModel: partnershipModel || null,
      cityState: cityState?.trim() || "",
      yearsExperience: yearsExperience || null,
      merchantNetworkSize: null,
      monthlyReferrals: null,
      panCard: panCard?.trim()?.toUpperCase() || "",
      aadhaarId: aadhaarId?.trim() || "",
      gstCertificate: normalizeFileMeta(gstCertificate),
      bankAccountHolderName: bankAccountHolderName?.trim() || "",
      bankName: bankName?.trim() || "",
      bankAccountNumber: bankAccountNumber?.trim() || "",
      bankIfsc: bankIfsc?.trim()?.toUpperCase() || "",
      bankBranch: bankBranch?.trim() || "",
      bankAccountType: bankAccountType || null,
      bankProof: normalizeFileMeta(bankProof),
      resellerAgreement: true,
      commissionPolicy: true,
      verificationStatus,
      source: "admin",
      userId: userResult.user._id,
      formStep: 3,
    });

    const sanitized = ResellerPartner.sanitize({
      ...partner,
      accountStatus: userResult.user.status ?? "active",
    });

    return res.status(201).json({
      id: sanitized.id,
      message: "Reseller onboarded successfully",
      reseller: sanitized,
    });
  } catch (error) {
    console.error("Admin onboard reseller error:", error);
    return res.status(500).json({ message: "Failed to onboard reseller" });
  }
}

/** FR-MA-06 — attach/replace KYC documents for an existing reseller */
export async function updateResellerOnboardingDocuments(req, res) {
  try {
    const partner = await ResellerPartner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const {
      panCard,
      aadhaarId,
      gstCertificate,
      bankProof,
      bankAccountHolderName,
      bankName,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      bankAccountType,
    } = req.body;

    const updates = {};

    if (panCard !== undefined) updates.panCard = String(panCard || "").trim().toUpperCase();
    if (aadhaarId !== undefined) updates.aadhaarId = String(aadhaarId || "").trim();
    if (gstCertificate !== undefined) updates.gstCertificate = normalizeFileMeta(gstCertificate);
    if (bankProof !== undefined) updates.bankProof = normalizeFileMeta(bankProof);
    if (bankAccountHolderName !== undefined) {
      updates.bankAccountHolderName = String(bankAccountHolderName || "").trim();
    }
    if (bankName !== undefined) updates.bankName = String(bankName || "").trim();
    if (bankAccountNumber !== undefined) {
      updates.bankAccountNumber = String(bankAccountNumber || "").trim();
    }
    if (bankIfsc !== undefined) updates.bankIfsc = String(bankIfsc || "").trim().toUpperCase();
    if (bankBranch !== undefined) updates.bankBranch = String(bankBranch || "").trim();
    if (bankAccountType !== undefined && bankAccountType !== "") {
      if (!RESELLER_BANK_ACCOUNT_TYPE_VALUES.includes(bankAccountType)) {
        return res.status(400).json({ message: "Invalid bank account type" });
      }
      updates.bankAccountType = bankAccountType;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No document fields to update" });
    }

    const next = { ...partner, ...updates };
    const profile = computeResellerProfileCompletion(next);
    if (
      partner.verificationStatus !== RESELLER_VERIFICATION_STATUSES.APPROVED &&
      partner.verificationStatus !== RESELLER_VERIFICATION_STATUSES.REJECTED
    ) {
      updates.verificationStatus = resolveVerificationStatus(partner, profile);
    }

    const result = await ResellerPartner.updateById(partner._id, updates);
    if (!result.updated) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([result.updated]);

    return res.json({
      message: "Reseller onboarding documents updated",
      reseller: ResellerPartner.sanitize(enriched),
    });
  } catch (error) {
    console.error("Update reseller documents error:", error);
    return res.status(500).json({ message: "Failed to update reseller documents" });
  }
}
