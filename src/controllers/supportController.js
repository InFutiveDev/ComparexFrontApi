import {
  ISSUE_CATEGORY_OPTIONS,
  PAYMENT_GATEWAY_OPTIONS,
  SUPPORT_DISCLOSURE,
} from "../constants/supportForm.js";
import { SupportRequest } from "../models/SupportRequest.js";
import { uploadFileToS3 } from "../services/s3Service.js";
import { handleUploadError } from "./uploadController.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(phone) {
  return phone.replace(/\s+/g, "").trim();
}

function parseBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function getField(body, ...keys) {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && String(body[key]).trim() !== "") {
      return String(body[key]).trim();
    }
  }

  return "";
}

export function getSupportFormOptions(_req, res) {
  return res.json({
    title: "CompareX Merchant Support Desk",
    subtitle: "Need Help navigating a Payment Gateway Issue?",
    paymentGateways: PAYMENT_GATEWAY_OPTIONS,
    issueCategories: ISSUE_CATEGORY_OPTIONS,
    disclosure: SUPPORT_DISCLOSURE,
    fields: [
      { name: "businessName", label: "Business Name", required: true },
      { name: "contactNumber", label: "Phone number (WhatsApp preferred)", required: true },
      { name: "businessEmail", label: "Business Email", required: true },
      { name: "website", label: "Website", required: false },
      { name: "paymentGateway", label: "Payment Gateway", required: true },
      { name: "issueCategory", label: "Issue Category", required: true },
      { name: "issueDescription", label: "Describe Your Issue", required: true },
      { name: "attachments", label: "Upload Screenshot / Documents", required: false },
      { name: "disclaimerAccepted", label: "Disclaimer acceptance", required: true },
    ],
  });
}

export async function getAllMerchantSupport(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await SupportRequest.findAll({ page, limit });

    return res.json({
      merchantSupport: result.items.map(SupportRequest.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Get merchant support error:", error);
    return res.status(500).json({ message: "Failed to fetch merchant support requests" });
  }
}

export async function submitSupportRequest(req, res) {
  try {
    const businessName = getField(req.body, "businessName");
    const contactNumber = getField(req.body, "contactNumber", "phone");
    const businessEmail = getField(req.body, "businessEmail", "email");
    const website = getField(req.body, "website") || null;
    const paymentGateway = getField(req.body, "paymentGateway");
    const issueCategory = getField(req.body, "issueCategory");
    const issueDescription = getField(req.body, "issueDescription");
    const disclaimerAccepted = parseBoolean(req.body.disclaimerAccepted);

    if (!businessName || !contactNumber || !businessEmail) {
      return res.status(400).json({
        message: "Business name, contact number, and business email are required",
      });
    }

    if (!EMAIL_PATTERN.test(businessEmail)) {
      return res.status(400).json({ message: "A valid business email is required" });
    }

    if (!paymentGateway) {
      return res.status(400).json({ message: "Payment gateway is required" });
    }

    if (!issueCategory) {
      return res.status(400).json({ message: "Issue category is required" });
    }

    if (!issueDescription) {
      return res.status(400).json({ message: "Issue description is required" });
    }

    if (!disclaimerAccepted) {
      return res.status(400).json({ message: "Disclaimer acceptance is required" });
    }

    const attachments = req.files?.length
      ? await Promise.all(
          req.files.map((file) => uploadFileToS3(file, "support")),
        )
      : [];

    const request = await SupportRequest.create({
      businessName,
      contactNumber: normalizePhone(contactNumber),
      businessEmail: businessEmail.toLowerCase(),
      website,
      paymentGateway,
      issueCategory,
      issueDescription,
      disclaimerAccepted: true,
      attachments,
      source: "merchant-support-desk",
    });

    return res.status(201).json({
      message: "Your request has been submitted successfully",
      request: SupportRequest.sanitize(request),
    });
  } catch (error) {
    return handleUploadError(error, res);
  }
}
