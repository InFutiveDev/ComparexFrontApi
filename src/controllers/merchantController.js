import {
  MERCHANT_INDUSTRIES,
  MERCHANT_INDUSTRY_VALUES,
  MERCHANT_PRIORITIES,
  MERCHANT_PRIORITY_VALUES,
} from "../constants/merchantForm.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { MerchantLead } from "../models/MerchantLead.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { LeadActivity } from "../models/LeadActivity.js";
import { LEAD_ACTIVITY_TYPES } from "../constants/leadWorkflow.js";
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

/** FR-MC-04 — authenticated merchant lead submission from the Merchant Panel. */
export async function submitMerchantPanelLead(req, res) {
  try {
    const {
      businessName,
      contactName,
      email,
      phone,
      merchantCategory,
      estimatedMonthlyVolume,
    } = req.body;

    if (
      !businessName?.trim() ||
      !contactName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !merchantCategory
    ) {
      return res.status(400).json({
        message:
          "Business name, contact name, email, phone, and merchant category are required",
      });
    }

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ message: emailError });
    const phoneError = validateMobilePhone(phone);
    if (phoneError) return res.status(400).json({ message: phoneError });
    if (!MERCHANT_INDUSTRY_VALUES.includes(merchantCategory)) {
      return res.status(400).json({ message: "Invalid merchant category" });
    }

    const volume = Number(estimatedMonthlyVolume);
    if (!Number.isFinite(volume) || volume <= 0) {
      return res.status(400).json({
        message: "Estimated monthly volume must be greater than zero",
      });
    }

    const lead = await MerchantLead.create({
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      industry: merchantCategory,
      merchantCategory,
      estimatedMonthlyVolume: volume,
      priority: null,
      source: "merchant-portal",
      userId: req.user._id,
      formStep: 3,
    });

    await LeadActivity.create({
      leadId: lead._id,
      type: LEAD_ACTIVITY_TYPES.CREATED,
      message: "Lead submitted from Merchant Panel",
      actorId: req.user._id,
      actorName: req.user.name || contactName.trim(),
      actorRole: USER_ROLES.MERCHANT,
      meta: {
        source: "merchant-portal",
        merchantCategory,
        estimatedMonthlyVolume: volume,
      },
    });

    return res.status(201).json({
      message: "Lead submitted successfully",
      lead: MerchantLead.sanitize({
        ...lead,
        accountStatus: req.user.status || "active",
      }),
    });
  } catch (error) {
    console.error("Merchant Panel lead submission error:", error);
    return res.status(500).json({ message: "Failed to submit merchant lead" });
  }
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
    const { businessName, email, phone, pgId } = req.body;

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

    let affiliateProvider = null;
    if (pgId) {
      affiliateProvider = await PaymentProvider.findById(pgId);
      if (!affiliateProvider) {
        return res.status(400).json({ message: "Invalid payment gateway affiliate link" });
      }
    }

    const now = new Date();
    const lead = await MerchantLead.create({
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      industry: null,
      priority: null,
      source: affiliateProvider ? "pg-affiliate" : "merchant",
      userId: null,
      formStep: 1,
      registeredViaPgId: affiliateProvider?._id ?? null,
      assignedPgId: affiliateProvider?._id ?? null,
      assignedPgName: affiliateProvider?.companyName ?? null,
      assignedAt: affiliateProvider ? now : null,
    });

    await LeadActivity.create({
      leadId: lead._id,
      type: LEAD_ACTIVITY_TYPES.CREATED,
      message: affiliateProvider
        ? `Merchant lead registered via ${affiliateProvider.companyName} affiliate link`
        : "Merchant lead submitted",
      actorName: businessName.trim(),
      actorRole: "merchant",
      meta: {
        source: affiliateProvider ? "pg-affiliate" : "merchant",
        formStep: 1,
        paymentProviderId: affiliateProvider?._id?.toString() ?? null,
      },
    });

    const sanitized = MerchantLead.sanitize({
      ...lead,
      accountStatus: "inactive",
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
        ? "Your request has been submitted successfully"
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
