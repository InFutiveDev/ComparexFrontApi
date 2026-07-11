import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { validatePassword } from "../utils/validation.js";

export async function createUserFromForm({ name, email, password, role, status = "active" }) {
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { status: 400, message: passwordError };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findByEmail(normalizedEmail);

  if (existingUser) {
    return {
      status: 409,
      message: "An account with this email already exists. Please sign in to your dashboard.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    status,
  });

  return { user };
}
