const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const INDIAN_MOBILE_10 = /^[6-9]\d{9}$/;
const INDIAN_MOBILE_11 = /^0[6-9]\d{9}$/;

export function normalizePhone(phone) {
  return phone.replace(/\s+/g, "").trim();
}

export function getPhoneDigits(phone) {
  return normalizePhone(phone).replace(/\D/g, "");
}

export function isValidMobilePhone(phone) {
  const digits = getPhoneDigits(phone);

  if (digits.length === 10) {
    return INDIAN_MOBILE_10.test(digits);
  }

  if (digits.length === 11) {
    return INDIAN_MOBILE_11.test(digits);
  }

  return false;
}

export function validateMobilePhone(phone) {
  const digits = getPhoneDigits(phone);

  if (!digits) {
    return "Mobile number is required";
  }

  if (digits.length < 10) {
    return "Mobile number must be at least 10 digits";
  }

  if (digits.length > 11) {
    return "Mobile number must be up to 11 digits";
  }

  if (!isValidMobilePhone(phone)) {
    return "Enter a valid mobile number";
  }

  return null;
}

export function isValidEmail(email) {
  return EMAIL_PATTERN.test((email || "").trim());
}

export function validateEmail(email) {
  const value = (email || "").trim();

  if (!value) {
    return "Email is required";
  }

  if (!isValidEmail(value)) {
    return "Enter a valid email address";
  }

  return null;
}
