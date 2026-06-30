import {
  MERCHANT_INDUSTRIES,
  MERCHANT_INDUSTRY_VALUES,
  MERCHANT_PRIORITIES,
  MERCHANT_PRIORITY_VALUES,
} from "../constants/merchantForm.js";
import { MerchantLead } from "../models/MerchantLead.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(phone) {
  return phone.replace(/\s+/g, "").trim();
}

export function getFormOptions(_req, res) {
  return res.json({
    title: "Let's connect you with the right Payment Gateway.",
    steps: [
      {
        step: 1,
        label: "Your details",
        fields: ["businessName", "email", "phone"],
      },
      {
        step: 2,
        label: "Business type",
        fields: ["industry"],
      },
      {
        step: 3,
        label: "Your priority",
        fields: ["priority"],
      },
    ],
    industries: MERCHANT_INDUSTRIES,
    priorities: MERCHANT_PRIORITIES,
  });
}

export async function submitMerchantForm(req, res) {
  try {
    const { businessName, email, phone, industry } = req.body;
    const priority = req.body.priority ?? req.body.business;

    if (!businessName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        message: "Business name, email, and phone are required",
      });
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: "A valid email address is required" });
    }

    if (!industry) {
      return res.status(400).json({ message: "Industry is required" });
    }

    if (!priority) {
      return res.status(400).json({ message: "Priority is required" });
    }

    if (!MERCHANT_INDUSTRY_VALUES.includes(industry)) {
      return res.status(400).json({ message: "Invalid industry value" });
    }

    if (!MERCHANT_PRIORITY_VALUES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority value" });
    }

    const lead = await MerchantLead.create({
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone),
      industry,
      priority,
      source: "merchant",
    });

    return res.status(201).json({
      message: "Your request has been submitted successfully",
      lead: MerchantLead.sanitize(lead),
    });
  } catch (error) {
    console.error("Merchant form error:", error);
    return res.status(500).json({ message: "Failed to submit merchant form" });
  }
}
