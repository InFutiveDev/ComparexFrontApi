export const LEAD_STATUSES = {
  NEW: "new",
  IN_REVIEW: "in_review",
  QUALIFIED: "qualified",
  REJECTED: "rejected",
  ASSIGNED: "assigned",
  EXPERT_BOOKED: "expert_booked",
};

export const LEAD_STATUS_VALUES = Object.values(LEAD_STATUSES);

export const LEAD_STATUS_LABELS = {
  [LEAD_STATUSES.NEW]: "New",
  [LEAD_STATUSES.IN_REVIEW]: "In Review",
  [LEAD_STATUSES.QUALIFIED]: "Qualified",
  [LEAD_STATUSES.REJECTED]: "Rejected",
  [LEAD_STATUSES.ASSIGNED]: "Assigned",
  [LEAD_STATUSES.EXPERT_BOOKED]: "Talk to Expert Booked",
};

export const LEAD_ACTIVITY_TYPES = {
  CREATED: "created",
  STATUS_UPDATED: "status_updated",
  QUALIFIED: "qualified",
  ASSIGNED_TO_PG: "assigned_to_pg",
  EXPERT_BOOKED: "expert_booked",
  BULK_UPLOADED: "bulk_uploaded",
  NOTE_ADDED: "note_added",
  PG_NOTIFIED: "pg_notified",
};
