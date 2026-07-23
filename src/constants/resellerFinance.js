export const COMMISSION_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  PAID: "paid",
};

export const COMMISSION_STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
};

export const COMMISSION_STATUS_VALUES = Object.values(COMMISSION_STATUSES);

export const INVOICE_PAYMENT_STATUSES = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  PAID: "paid",
  REJECTED: "rejected",
};

export const INVOICE_PAYMENT_STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
};

export const INVOICE_PAYMENT_STATUS_VALUES = Object.values(INVOICE_PAYMENT_STATUSES);

export const KYC_DISPLAY_STATUSES = {
  INCOMPLETE: "incomplete",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

export const KYC_DISPLAY_STATUS_LABELS = {
  incomplete: "Incomplete",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export function mapVerificationToKycStatus(verificationStatus) {
  switch (verificationStatus) {
    case "pending_review":
      return KYC_DISPLAY_STATUSES.PENDING;
    case "approved":
      return KYC_DISPLAY_STATUSES.VERIFIED;
    case "rejected":
      return KYC_DISPLAY_STATUSES.REJECTED;
    default:
      return KYC_DISPLAY_STATUSES.INCOMPLETE;
  }
}
