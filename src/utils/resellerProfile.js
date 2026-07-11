import { RESELLER_VERIFICATION_STATUSES } from "../constants/resellerForm.js";

function hasText(value) {
  return Boolean(typeof value === "string" ? value.trim() : value);
}

function hasFile(value) {
  return Boolean(value && (value.key || value.url || value.fileName));
}

/** Weighted checklist used for profile completion % after step-1 signup. */
export const RESELLER_PROFILE_CHECKS = [
  { key: "partnershipModel", label: "Preferred Partnership Model", required: true, test: (p) => hasText(p.partnershipModel) },
  { key: "cityState", label: "City & State", required: true, test: (p) => hasText(p.cityState) },
  { key: "yearsExperience", label: "Years of Experience", required: true, test: (p) => hasText(p.yearsExperience) },
  { key: "merchantNetworkSize", label: "Existing Merchant Network Size", required: false, test: (p) => hasText(p.merchantNetworkSize) },
  { key: "monthlyReferrals", label: "Estimated Monthly Referrals", required: false, test: (p) => hasText(p.monthlyReferrals) },
  { key: "panCard", label: "PAN Card", required: true, test: (p) => hasText(p.panCard) },
  { key: "aadhaarId", label: "Aadhaar / Govt ID", required: true, test: (p) => hasText(p.aadhaarId) },
  { key: "gstCertificate", label: "GST Certificate", required: false, test: (p) => hasFile(p.gstCertificate) },
  {
    key: "bankDetails",
    label: "Bank Account Details",
    required: true,
    test: (p) =>
      hasText(p.bankAccountHolderName) &&
      hasText(p.bankName) &&
      hasText(p.bankAccountNumber) &&
      hasText(p.bankIfsc) &&
      hasText(p.bankAccountType),
  },
  { key: "bankProof", label: "Cancelled Cheque / Bank Proof", required: true, test: (p) => hasFile(p.bankProof) },
  { key: "resellerAgreement", label: "Reseller Agreement", required: true, test: (p) => Boolean(p.resellerAgreement) },
  { key: "commissionPolicy", label: "Commission Policy", required: true, test: (p) => Boolean(p.commissionPolicy) },
];

export function computeResellerProfileCompletion(partner = {}) {
  const checks = RESELLER_PROFILE_CHECKS.map((item) => ({
    key: item.key,
    label: item.label,
    required: item.required,
    complete: item.test(partner),
  }));

  const total = checks.length;
  const completed = checks.filter((item) => item.complete).length;
  const requiredChecks = checks.filter((item) => item.required);
  const requiredComplete = requiredChecks.every((item) => item.complete);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    percent,
    completed,
    total,
    requiredComplete,
    checks,
  };
}

export function resolveVerificationStatus(partner, profile) {
  const current = partner.verificationStatus || RESELLER_VERIFICATION_STATUSES.INCOMPLETE;

  if (
    current === RESELLER_VERIFICATION_STATUSES.APPROVED ||
    current === RESELLER_VERIFICATION_STATUSES.REJECTED
  ) {
    return current;
  }

  if (profile.requiredComplete) {
    return RESELLER_VERIFICATION_STATUSES.PENDING_REVIEW;
  }

  return RESELLER_VERIFICATION_STATUSES.INCOMPLETE;
}
