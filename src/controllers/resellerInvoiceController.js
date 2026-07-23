import {
  INVOICE_PAYMENT_STATUS_LABELS,
  INVOICE_PAYMENT_STATUS_VALUES,
  INVOICE_PAYMENT_STATUSES,
} from "../constants/resellerFinance.js";
import { ResellerInvoice } from "../models/ResellerInvoice.js";
import { ResellerPartner } from "../models/ResellerPartner.js";

async function getCurrentReseller(req) {
  return ResellerPartner.findByUserId(req.userId);
}

function sanitizeFile(file) {
  if (!file || typeof file !== "object") return null;
  return {
    key: file.key || null,
    url: file.url || null,
    fileName: file.fileName || null,
    mimeType: file.mimeType || null,
    size: file.size || null,
  };
}

/** FR-RS-07 / FR-RS-08 — invoice upload and payment status. */
export async function listMyResellerInvoices(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const { status, page, limit } = req.query;

    if (status && !INVOICE_PAYMENT_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Invalid invoice payment status" });
    }

    const result = await ResellerInvoice.findForReseller(partner._id, { status, page, limit });

    return res.json({
      invoices: result.items.map(ResellerInvoice.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
      statuses: INVOICE_PAYMENT_STATUS_VALUES.map((value) => ({
        value,
        label: INVOICE_PAYMENT_STATUS_LABELS[value],
      })),
    });
  } catch (error) {
    console.error("List reseller invoices error:", error);
    return res.status(500).json({ message: "Failed to fetch invoices" });
  }
}

export async function submitMyResellerInvoice(req, res) {
  try {
    const partner = await getCurrentReseller(req);
    if (!partner) {
      return res.status(404).json({ message: "Reseller profile not found" });
    }

    const { invoiceNumber, amount, periodStart, periodEnd, invoiceFile } = req.body;

    if (!invoiceNumber?.trim()) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "A valid invoice amount is required" });
    }

    if (!invoiceFile?.url && !invoiceFile?.key) {
      return res.status(400).json({ message: "Invoice file upload is required" });
    }

    const fileMeta = sanitizeFile(invoiceFile);
    if (!fileMeta?.url && !fileMeta?.key) {
      return res.status(400).json({ message: "Invalid invoice file metadata" });
    }

    const invoice = await ResellerInvoice.create({
      resellerId: partner._id,
      invoiceNumber: invoiceNumber.trim(),
      amount: parsedAmount,
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      invoiceFile: sanitizeFile(invoiceFile),
      paymentStatus: INVOICE_PAYMENT_STATUSES.SUBMITTED,
    });

    return res.status(201).json({
      message: "Invoice submitted for payout review",
      invoice: ResellerInvoice.sanitize(invoice),
    });
  } catch (error) {
    console.error("Submit reseller invoice error:", error);
    return res.status(500).json({ message: "Failed to submit invoice" });
  }
}
