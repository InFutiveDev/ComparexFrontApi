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

export async function getMerchantGatewayById(req, res) {
  try {
    const lead = await MerchantLead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Merchant gateway not found" });
    }

    const [enriched] = await enrichItemsWithAccountStatus([lead]);

    return res.json({
      merchantGateway: MerchantLead.sanitize(enriched),
    });
  } catch (error) {
    console.error("Get merchant gateway error:", error);
    return res.status(500).json({ message: "Failed to fetch merchant gateway" });
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
    const { businessName, email, phone, password } = req.body;

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
      industry: null,
      priority: null,
      source: "merchant",
      userId: userResult.user._id,
      formStep: 1,
    });

    const sanitized = MerchantLead.sanitize({
      ...lead,
      accountStatus: userResult.user.status ?? "inactive",
    });

    return res.status(201).json({
      id: sanitized.id,
      message: "Step 1 saved successfully",
      lead: sanitized,
    });
  } catch (error) {
    console.error("Merchant form error:", error);
    return res.status(500).json({ message: "Failed to submit merchant form" });
  }
}

export async function updateMerchantForm(req, res) {
  try {
    const lead = await MerchantLead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Merchant gateway not found" });
    }

    const { businessName, email, phone, industry, step } = req.body;
    const priority = req.body.priority ?? req.body.business;
    const updates = {};
    const formStep = Number(step);

    if (formStep === 1) {
      if (!businessName?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({
          message: "Business name, email, and phone are required",
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

      updates.businessName = businessName.trim();
      updates.email = email.trim().toLowerCase();
      updates.phone = getPhoneDigits(phone);
      updates.formStep = Math.max(lead.formStep ?? 1, 1);
    } else if (formStep === 2) {
      if (!industry) {
        return res.status(400).json({ message: "Industry is required" });
      }
      if (!MERCHANT_INDUSTRY_VALUES.includes(industry)) {
        return res.status(400).json({ message: "Invalid industry value" });
      }
      updates.industry = industry;
      updates.formStep = Math.max(lead.formStep ?? 1, 2);
    } else if (formStep === 3) {
      if (!priority) {
        return res.status(400).json({ message: "Priority is required" });
      }
      if (!MERCHANT_PRIORITY_VALUES.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority value" });
      }
      updates.priority = priority;
      updates.formStep = 3;
    } else {
      return res.status(400).json({ message: "A valid form step is required" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const result = await MerchantLead.updateById(req.params.id, updates);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid merchant gateway id" });
    }

    if (!result.updated) {
      return res.status(404).json({ message: "Merchant gateway not found" });
    }

    const isComplete = Boolean(result.updated.industry && result.updated.priority);
    const sanitized = MerchantLead.sanitize(result.updated);

    return res.json({
      id: sanitized.id,
      message: isComplete
        ? "Your request has been submitted successfully. You can sign in once an admin activates your account."
        : "Progress saved successfully",
      lead: sanitized,
      completed: isComplete,
    });
  } catch (error) {
    console.error("Update merchant form error:", error);
    return res.status(500).json({ message: "Failed to update merchant form" });
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
