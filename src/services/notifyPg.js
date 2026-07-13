import { ObjectId } from "mongodb";
import { Notification } from "../models/Notification.js";
import { LeadActivity } from "../models/LeadActivity.js";
import { LEAD_ACTIVITY_TYPES } from "../constants/leadWorkflow.js";

/**
 * Persists a PG notification and records lead activity.
 * Email/SMS delivery can be wired later; for now notifications are stored for the PG dashboard.
 */
export async function notifyPgLeadAssignment({
  provider,
  lead,
  actor,
}) {
  const title = "New merchant lead assigned";
  const message = `Lead "${lead.businessName}" (${lead.email}) has been assigned to ${provider.companyName}.`;

  const notification = await Notification.create({
    type: "lead_assigned",
    title,
    message,
    recipientType: "payment_provider",
    recipientId: provider._id,
    recipientEmail: provider.email,
    leadId: lead._id,
    status: "sent",
    meta: {
      leadBusinessName: lead.businessName,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      leadIndustry: lead.industry ?? null,
      leadPriority: lead.priority ?? null,
      assignedBy: actor?._id?.toString?.() ?? null,
    },
  });

  await LeadActivity.create({
    leadId: lead._id,
    type: LEAD_ACTIVITY_TYPES.PG_NOTIFIED,
    message: `Payment gateway notified at ${provider.email}`,
    actorId: actor?._id?.toString?.() ?? null,
    actorName: actor?.name ?? null,
    actorRole: actor?.role ?? null,
    meta: {
      notificationId: notification._id.toString(),
      providerId: provider._id.toString(),
      providerEmail: provider.email,
    },
  });

  console.log(`[notify] PG ${provider.email}: ${message}`);

  return notification;
}
