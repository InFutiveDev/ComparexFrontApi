import { User } from "../models/User.js";

const VALID_STATUSES = new Set(["active", "inactive"]);

export async function setUserAccountStatus(userId, status) {
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, status: 400, message: "Status must be active or inactive" };
  }

  if (!userId) {
    return { ok: false, status: 400, message: "No user account linked to this record" };
  }

  const result = await User.updateStatus(userId, status);

  if (!result.updated) {
    return { ok: false, status: 404, message: "User account not found" };
  }

  return { ok: true, accountStatus: status };
}

export async function enrichItemsWithAccountStatus(items) {
  const userIds = items.map((item) => item.userId).filter(Boolean);

  if (userIds.length === 0) {
    return items.map((item) => ({
      ...item,
      accountStatus: "inactive",
    }));
  }

  const users = await User.findByIds(userIds);
  const statusByUserId = new Map(
    users.map((user) => [user._id.toString(), user.status ?? "inactive"]),
  );

  return items.map((item) => ({
    ...item,
    accountStatus: item.userId
      ? (statusByUserId.get(item.userId.toString()) ?? "inactive")
      : "inactive",
  }));
}
