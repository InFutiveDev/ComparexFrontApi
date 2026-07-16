import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

export async function notifyPgLeadStatusUpdate({ lead, provider, status, remarks, actor }) {
  const statusLabel = status === "live" ? "Live" : "Rejected";
  const common = {
    type: "pg_lead_status_updated",
    title: `Lead marked ${statusLabel}`,
    message: `${provider.companyName} marked ${lead.businessName} as ${statusLabel}. Remarks: ${remarks}`,
    leadId: lead._id,
    status: "sent",
    meta: {
      pgLeadStatus: status,
      remarks,
      paymentProviderId: provider._id.toString(),
      paymentProviderName: provider.companyName,
      updatedBy: actor?._id?.toString?.() ?? null,
    },
  };

  let assignedSubAdmin = null;
  if (lead.assignedBy) {
    try {
      assignedSubAdmin = await User.findById(lead.assignedBy);
    } catch {
      assignedSubAdmin = null;
    }
  }

  const notifications = [];
  const subAdminRecipients = assignedSubAdmin
    ? [assignedSubAdmin]
    : await User.findByRole("sub_admin");

  for (const subAdmin of subAdminRecipients) {
    notifications.push(
      await Notification.create({
        ...common,
        recipientType: "sub_admin",
        recipientId: subAdmin._id,
        recipientEmail: subAdmin.email,
      }),
    );
  }

  notifications.push(
    await Notification.create({
      ...common,
      recipientType: "merchant",
      recipientId: lead.userId ?? null,
      recipientEmail: lead.email,
    }),
  );

  return notifications;
}
