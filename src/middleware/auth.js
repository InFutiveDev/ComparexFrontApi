import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";
import { User } from "../models/User.js";
import { isStaffRole, USER_ROLES } from "../constants/userRoles.js";

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact an administrator.",
      });
    }

    req.userId = user._id.toString();
    req.userEmail = user.email;
    req.userRole = user.role;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.status === "inactive") {
        return res.status(403).json({ message: "Account is inactive" });
      }

      req.user = user;
      req.userRole = user.role;

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "You do not have permission to perform this action" });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({ message: "Failed to verify permissions" });
    }
  };
}

export const requireSubAdmin = requireRoles(USER_ROLES.SUB_ADMIN, USER_ROLES.ADMIN);
export const requireAdmin = requireRoles(USER_ROLES.ADMIN);
export const requirePaymentProvider = requireRoles(USER_ROLES.PAYMENT_PROVIDER);
export const requireReseller = requireRoles(USER_ROLES.RESELLER);
export const requireMerchant = requireRoles(USER_ROLES.MERCHANT);

export function requireStaff(req, res, next) {
  return requireRoles(USER_ROLES.SUB_ADMIN, USER_ROLES.ADMIN)(req, res, next);
}

export { isStaffRole };
