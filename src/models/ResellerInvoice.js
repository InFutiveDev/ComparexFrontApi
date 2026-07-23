import { getDb } from "../mongo.js";
import { INVOICE_PAYMENT_STATUSES } from "../constants/resellerFinance.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "reseller_invoices";

function invoices() {
  return getDb().collection(COLLECTION);
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

export const ResellerInvoice = {
  async create(data) {
    const now = new Date();
    const doc = {
      paymentStatus: INVOICE_PAYMENT_STATUSES.SUBMITTED,
      currency: "INR",
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const result = await invoices().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findForReseller(resellerId, { status, page = 1, limit = 50 } = {}) {
    const partnerId = parseObjectId(resellerId);
    if (!partnerId) return { items: [], total: 0, page: 1, limit: 50 };

    const filter = { resellerId: partnerId };
    if (status) filter.paymentStatus = status;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      invoices().find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      invoices().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async findByIdForReseller(id, resellerId) {
    return invoices().findOne({
      _id: parseObjectId(id),
      resellerId: parseObjectId(resellerId),
    });
  },

  sanitize(invoice) {
    return {
      id: invoice._id.toString(),
      resellerId: invoice.resellerId?.toString?.() ?? null,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      currency: invoice.currency ?? "INR",
      periodStart: invoice.periodStart ?? null,
      periodEnd: invoice.periodEnd ?? null,
      invoiceFile: sanitizeFile(invoice.invoiceFile),
      paymentStatus: invoice.paymentStatus,
      adminNotes: invoice.adminNotes ?? null,
      paidAt: invoice.paidAt ?? null,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt ?? null,
    };
  },
};
