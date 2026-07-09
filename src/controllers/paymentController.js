import {
  PAYMENT_CAPABILITY_VALUES,
  PAYMENT_CAPABILITIES,
  PAYMENT_PARTNERSHIP_GOAL_VALUES,
  PAYMENT_PARTNERSHIP_GOALS,
} from "../constants/paymentForm.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { createUserFromForm } from "../services/formUserAccount.js";
import { enrichItemsWithAccountStatus, setUserAccountStatus } from "../services/accountStatus.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";

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
      password,
    } = req.body;

    if (
      !companyName?.trim() ||
      !contactPerson?.trim() ||
      !designation?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Company name, contact person, designation, email, phone, and password are required",
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

    if (!Array.isArray(paymentCapabilities) || paymentCapabilities.length === 0) {
      return res.status(400).json({ message: "At least one payment capability is required" });
    }

    if (!Array.isArray(partnershipGoals) || partnershipGoals.length === 0) {
      return res.status(400).json({ message: "At least one partnership goal is required" });
    }

    if (!consent) {
      return res.status(400).json({ message: "Consent is required" });
    }

    const invalidCapability = paymentCapabilities.find(
      (value) => !PAYMENT_CAPABILITY_VALUES.includes(value),
    );
    if (invalidCapability) {
      return res.status(400).json({ message: "Invalid payment capability value" });
    }

    const invalidGoal = partnershipGoals.find(
      (value) => !PAYMENT_PARTNERSHIP_GOAL_VALUES.includes(value),
    );
    if (invalidGoal) {
      return res.status(400).json({ message: "Invalid partnership goal value" });
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
      designation: designation.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      paymentCapabilities,
      partnershipGoals,
      consent: true,
      source: "payment",
      userId: userResult.user._id,
    });

    return res.status(201).json({
      message:
        "Your partnership inquiry has been submitted successfully. You can sign in once an admin activates your account.",
      provider: PaymentProvider.sanitize({
        ...provider,
        accountStatus: userResult.user.status ?? "inactive",
      }),
    });
  } catch (error) {
    console.error("Payment form error:", error);
    return res.status(500).json({ message: "Failed to submit partnership inquiry" });
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
