import { Notification } from "../models/Notification.js";

const notificationsEnabled = process.env.NOTIFICATIONS_ENABLED === "true";

/** In-app notifications for the logged-in Sub Admin or Merchant. */
export async function listMyNotifications(req, res) {
  try {
    if (!notificationsEnabled) {
      return res.status(503).json({ message: "Notifications are currently disabled" });
    }

    const recipientType =
      req.userRole === "sub_admin"
        ? "sub_admin"
        : req.userRole === "merchant"
          ? "merchant"
          : req.userRole;
    const { page, limit } = req.query;
    const result = await Notification.findByRecipient({
      recipientType,
      recipientId: req.userId,
      recipientEmail: req.userEmail,
      page,
      limit,
    });

    return res.json({
      notifications: result.items.map(Notification.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("List my notifications error:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
}
