import {
  RESELLER_BUSINESS_TYPE_VALUES,
  RESELLER_BUSINESS_TYPES,
  RESELLER_MONTHLY_BUSINESS_COUNT_VALUES,
  RESELLER_MONTHLY_BUSINESS_COUNTS,
  RESELLER_PARTNER_TYPE_VALUES,
  RESELLER_PARTNER_TYPES,
  RESELLER_PAYMENT_FAMILIARITY,
  RESELLER_PAYMENT_FAMILIARITY_VALUES,
} from "../constants/resellerForm.js";
import { ResellerPartner } from "../models/ResellerPartner.js";
import { createUserFromForm } from "../services/formUserAccount.js";
import { enrichItemsWithAccountStatus, setUserAccountStatus } from "../services/accountStatus.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";

export function getFormOptions(_req, res) {
  return res.json({
    title: "Let's Build Your Partner Profile",
    steps: [
      {
        step: 1,
        label: "Partner profile",
        fields: ["fullName", "businessName", "phone", "email", "website", "partnerType"],
      },
      {
        step: 2,
        label: "Business network",
        fields: ["businessTypes", "monthlyBusinessCount"],
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
      source: "reseller",
      userId: userResult.user._id,
      formStep: 1,
    });

    const sanitized = ResellerPartner.sanitize({
      ...partner,
      accountStatus: userResult.user.status ?? "inactive",
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

    const {
      fullName,
      businessName,
      phone,
      email,
      website,
      partnerType,
      businessTypes,
      monthlyBusinessCount,
      paymentFamiliarity,
      consent,
      step,
    } = req.body;

    const updates = {};
    const formStep = Number(step);

    if (formStep === 1) {
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
      if (!partnerType) {
        return res.status(400).json({ message: "Partner type is required" });
      }

      if (!RESELLER_PARTNER_TYPE_VALUES.includes(partnerType)) {
        return res.status(400).json({ message: "Invalid partner type value" });
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

      if (!monthlyBusinessCount) {
        return res.status(400).json({ message: "Monthly business count is required" });
      }

      if (!RESELLER_MONTHLY_BUSINESS_COUNT_VALUES.includes(monthlyBusinessCount)) {
        return res.status(400).json({ message: "Invalid monthly business count value" });
      }

      updates.partnerType = partnerType;
      updates.businessTypes = businessTypes;
      updates.monthlyBusinessCount = monthlyBusinessCount;
      updates.formStep = Math.max(partner.formStep ?? 1, 2);
    } else if (formStep === 3) {
      if (!paymentFamiliarity) {
        return res.status(400).json({ message: "Payment familiarity is required" });
      }

      if (!RESELLER_PAYMENT_FAMILIARITY_VALUES.includes(paymentFamiliarity)) {
        return res.status(400).json({ message: "Invalid payment familiarity value" });
      }

      if (!consent) {
        return res.status(400).json({ message: "Consent is required" });
      }

      updates.paymentFamiliarity = paymentFamiliarity;
      updates.consent = true;
      updates.formStep = 3;
    } else {
      return res.status(400).json({ message: "A valid form step is required" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
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
        ? "Your partner application has been submitted successfully. You can sign in once an admin activates your account."
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
