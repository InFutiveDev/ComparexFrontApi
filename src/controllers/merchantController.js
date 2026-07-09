import {
  MERCHANT_INDUSTRIES,
  MERCHANT_INDUSTRY_VALUES,
  MERCHANT_PRIORITIES,
  MERCHANT_PRIORITY_VALUES,
} from "../constants/merchantForm.js";
import { MerchantLead } from "../models/MerchantLead.js";
import { createUserFromForm } from "../services/formUserAccount.js";
import { enrichItemsWithAccountStatus, setUserAccountStatus } from "../services/accountStatus.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";

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

export async function getAllMerchantGateways(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await MerchantLead.findAll({ page, limit });
    const enrichedItems = await enrichItemsWithAccountStatus(result.items);

    return res.json({
      merchantGateways: enrichedItems.map(MerchantLead.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Get merchant gateways error:", error);
    return res.status(500).json({ message: "Failed to fetch merchant gateways" });
  }
}

export async function deleteMerchantGateway(req, res) {
  try {
    const result = await MerchantLead.deleteById(req.params.id);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid merchant gateway id" });
    }

    if (!result.deleted) {
      return res.status(404).json({ message: "Merchant gateway not found" });
    }

    return res.json({ message: "Merchant gateway deleted successfully" });
  } catch (error) {
    console.error("Delete merchant gateway error:", error);
    return res.status(500).json({ message: "Failed to delete merchant gateway" });
  }
}

export async function submitMerchantForm(req, res) {
  try {
    const { businessName, email, phone, industry, password } = req.body;
    const priority = req.body.priority ?? req.body.business;

    if (!businessName?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({
        message: "Business name, email, phone, and password are required",
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

    const userResult = await createUserFromForm({
      name: businessName.trim(),
      email,
      password,
      role: "merchant",
    });

    if (userResult.message) {
      return res.status(userResult.status).json({ message: userResult.message });
    }

    const lead = await MerchantLead.create({
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      industry,
      priority,
      source: "merchant",
      userId: userResult.user._id,
    });

    return res.status(201).json({
      message:
        "Your request has been submitted successfully. You can sign in once an admin activates your account.",
      lead: MerchantLead.sanitize({
        ...lead,
        accountStatus: userResult.user.status ?? "inactive",
      }),
    });
  } catch (error) {
    console.error("Merchant form error:", error);
    return res.status(500).json({ message: "Failed to submit merchant form" });
  }
}

export async function updateMerchantAccountStatus(req, res) {
  try {
    const lead = await MerchantLead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Merchant gateway not found" });
    }

    const result = await setUserAccountStatus(lead.userId, req.body.status);

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      message: `Account ${result.accountStatus === "active" ? "activated" : "deactivated"} successfully`,
      accountStatus: result.accountStatus,
    });
  } catch (error) {
    console.error("Update merchant account status error:", error);
    return res.status(500).json({ message: "Failed to update account status" });
  }
}
