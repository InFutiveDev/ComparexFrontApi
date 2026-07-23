import bcrypt from "bcryptjs";
import { USER_ROLES } from "../constants/userRoles.js";
import { User } from "../models/User.js";
import { ensureRoleProfileForUser } from "../services/provisionRoleProfile.js";
import { validateEmail } from "../utils/validation.js";

const ASSIGNABLE_ROLES = Object.values(USER_ROLES);
const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: "Master Admin",
  [USER_ROLES.SUB_ADMIN]: "Sub Admin",
  [USER_ROLES.MERCHANT]: "Merchant",
  [USER_ROLES.RESELLER]: "Reseller",
  [USER_ROLES.PAYMENT_PROVIDER]: "Payment Gateway",
};

function sanitizeUserListItem(user) {
  return User.sanitize(user);
}

export async function listAdminUsers(req, res) {
  try {
    const { page, limit, role, status, search } = req.query;

    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role filter" });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    const result = await User.findAll({ page, limit, role, status, search });

    return res.json({
      users: result.items.map(sanitizeUserListItem),
      total: result.total,
      page: result.page,
      limit: result.limit,
      roles: ASSIGNABLE_ROLES.map((value) => ({
        value,
        label: ROLE_LABELS[value] || value,
      })),
    });
  } catch (error) {
    console.error("List admin users error:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
}

export async function createAdminUser(req, res) {
  try {
    const { name, email, password, role, status = "active" } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    if (!role || !ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: "A valid role is required" });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or inactive" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      status,
    });

    await ensureRoleProfileForUser(user, "admin");

    return res.status(201).json({
      message: "User created successfully",
      user: sanitizeUserListItem(user),
    });
  } catch (error) {
    console.error("Create admin user error:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
}

export async function updateAdminUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, role, status } = req.body;
    const updates = {};
    const isSelf = user._id.toString() === req.userId;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      updates.name = String(name).trim();
    }

    if (role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      if (isSelf && role !== USER_ROLES.ADMIN) {
        return res.status(400).json({ message: "You cannot change your own admin role" });
      }
      updates.role = role;
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Status must be active or inactive" });
      }
      if (isSelf && status === "inactive") {
        return res.status(400).json({ message: "You cannot deactivate your own account" });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const result = await User.updateById(req.params.id, updates);
    if (!result.updated) {
      return res.status(404).json({ message: "User not found" });
    }

    if (updates.role) {
      await ensureRoleProfileForUser(result.updated, "admin");
    }

    return res.json({
      message: "User updated successfully",
      user: sanitizeUserListItem(result.updated),
    });
  } catch (error) {
    console.error("Update admin user error:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
}
