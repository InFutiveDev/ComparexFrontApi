import { USER_ROLES } from "../constants/userRoles.js";
import { RESELLER_VERIFICATION_STATUSES } from "../constants/resellerForm.js";
import { ResellerPartner } from "../models/ResellerPartner.js";
import { PaymentProvider } from "../models/PaymentProvider.js";

function displayName(user) {
  return user.name?.trim() || user.email;
}

export async function ensureResellerPartnerForUser(user, source = "admin") {
  const existing = await ResellerPartner.findByUserId(user._id);
  if (existing) return existing;

  const name = displayName(user);

  return ResellerPartner.create({
    fullName: name,
    businessName: name,
    email: user.email,
    phone: "",
    website: "",
    partnerType: null,
    businessTypes: [],
    monthlyBusinessCount: null,
    paymentFamiliarity: null,
    consent: false,
    partnershipModel: null,
    cityState: "",
    yearsExperience: null,
    merchantNetworkSize: null,
    monthlyReferrals: null,
    panCard: "",
    aadhaarId: "",
    gstCertificate: null,
    bankAccountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    bankAccountType: null,
    bankProof: null,
    resellerAgreement: false,
    commissionPolicy: false,
    verificationStatus: RESELLER_VERIFICATION_STATUSES.INCOMPLETE,
    source,
    userId: user._id,
    formStep: 1,
  });
}

export async function ensurePaymentProviderForUser(user, source = "admin") {
  const existing = await PaymentProvider.findByUserId(user._id);
  if (existing) return existing;

  const name = displayName(user);

  return PaymentProvider.create({
    companyName: name,
    contactPerson: name,
    designation: "Not specified",
    email: user.email,
    phone: "",
    website: "",
    paymentCapabilities: [],
    partnershipGoals: [],
    consent: false,
    source,
    userId: user._id,
    formStep: 1,
    onboarding: {
      brandName: name,
      legalEntityName: name,
      websiteUrl: "",
    },
    verificationStatus: "incomplete",
  });
}

/** Create portal profile records when admin assigns merchant/reseller/PG roles. */
export async function ensureRoleProfileForUser(user, source = "admin") {
  if (!user?._id || !user.role) return null;

  switch (user.role) {
    case USER_ROLES.RESELLER:
      return ensureResellerPartnerForUser(user, source);
    case USER_ROLES.PAYMENT_PROVIDER:
      return ensurePaymentProviderForUser(user, source);
    default:
      return null;
  }
}
