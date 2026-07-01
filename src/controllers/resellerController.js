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

export async function submitResellerForm(req, res) {
  try {
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
    } = req.body;

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

    if (!partnerType) {
      return res.status(400).json({ message: "Partner type is required" });
    }

    if (!Array.isArray(businessTypes) || businessTypes.length === 0) {
      return res.status(400).json({ message: "At least one business type is required" });
    }

    if (!monthlyBusinessCount) {
      return res.status(400).json({ message: "Monthly business count is required" });
    }

    if (!paymentFamiliarity) {
      return res.status(400).json({ message: "Payment familiarity is required" });
    }

    if (!consent) {
      return res.status(400).json({ message: "Consent is required" });
    }

    if (!RESELLER_PARTNER_TYPE_VALUES.includes(partnerType)) {
      return res.status(400).json({ message: "Invalid partner type value" });
    }

    const invalidBusinessType = businessTypes.find(
      (value) => !RESELLER_BUSINESS_TYPE_VALUES.includes(value),
    );
    if (invalidBusinessType) {
      return res.status(400).json({ message: "Invalid business type value" });
    }

    if (!RESELLER_MONTHLY_BUSINESS_COUNT_VALUES.includes(monthlyBusinessCount)) {
      return res.status(400).json({ message: "Invalid monthly business count value" });
    }

    if (!RESELLER_PAYMENT_FAMILIARITY_VALUES.includes(paymentFamiliarity)) {
      return res.status(400).json({ message: "Invalid payment familiarity value" });
    }

    const partner = await ResellerPartner.create({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      partnerType,
      businessTypes,
      monthlyBusinessCount,
      paymentFamiliarity,
      consent: true,
      source: "reseller",
    });

    return res.status(201).json({
      message: "Your partner application has been submitted successfully",
      partner: ResellerPartner.sanitize(partner),
    });
  } catch (error) {
    console.error("Reseller form error:", error);
    return res.status(500).json({ message: "Failed to submit partner application" });
  }
}
