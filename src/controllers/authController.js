import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { issueAuthTokens } from "../utils/authTokens.js";
import { buildAuthResponse } from "../utils/authResponse.js";
import {
  canLoginWithRole,
  formatRoleLabel,
  resolveLoginRole,
  USER_ROLES,
} from "../constants/userRoles.js";

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      status: "active",
    });

    const tokens = await issueAuthTokens(user);

    return res.status(201).json(buildAuthResponse(user, tokens));
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Failed to create account" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, role, accountType } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const expectedRole = resolveLoginRole({ role, accountType });

    if (accountType && !expectedRole) {
      return res.status(400).json({ message: "Invalid account type selected" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!canLoginWithRole(user.role, expectedRole)) {
      return res.status(403).json({
        message: `This account is registered as ${formatRoleLabel(user.role)}. Please sign in using the ${formatRoleLabel(user.role)} tab.`,
      });
    }

    if ((user.status ?? "inactive") !== "active" && (user.role ?? "user") !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        message: "Your account is inactive. Please contact admin to activate your account.",
      });
    }

    const tokens = await issueAuthTokens(user);

    return res.json(buildAuthResponse(user, tokens));
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Failed to sign in" });
  }
}

export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const stored = await RefreshToken.findValid(refreshToken);
    if (!stored) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      await RefreshToken.revoke(refreshToken);
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    if ((user.status ?? "inactive") !== "active" && (user.role ?? "user") !== USER_ROLES.ADMIN) {
      await RefreshToken.revoke(refreshToken);
      return res.status(403).json({ message: "Your account is inactive" });
    }

    await RefreshToken.revoke(refreshToken);
    const tokens = await issueAuthTokens(user);

    return res.json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ message: "Failed to refresh token" });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if ((user.status ?? "inactive") !== "active" && (user.role ?? "user") !== USER_ROLES.ADMIN) {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    return res.json({ user: User.sanitize(user) });
  } catch (error) {
    console.error("Me error:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
}
