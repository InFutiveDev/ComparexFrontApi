import {
  EXPERT_BOOKING_STATUSES,
  EXPERT_INDUSTRY_VALUES,
  EXPERT_PRIORITY_VALUES,
} from "../constants/expertForm.js";
import { ExpertBooking } from "../models/ExpertBooking.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { resolvePgExperts } from "../utils/pgExperts.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";

export async function getAllExpertBookings(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await ExpertBooking.findAll({ page, limit });

    return res.json({
      expertBookings: result.items.map(ExpertBooking.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Get expert bookings error:", error);
    return res.status(500).json({ message: "Failed to fetch expert bookings" });
  }
}

export async function getExpertBookingById(req, res) {
  try {
    const booking = await ExpertBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Expert booking not found" });
    }

    return res.json({
      expertBooking: ExpertBooking.sanitize(booking),
    });
  } catch (error) {
    console.error("Get expert booking error:", error);
    return res.status(500).json({ message: "Failed to fetch expert booking" });
  }
}

export async function submitExpertBooking(req, res) {
  try {
    const {
      fullName,
      businessName,
      email,
      phone,
      website,
      industry,
      priority,
      paymentGatewayId,
      paymentGatewayName,
      expertId,
      representativeName,
      representativeTitle,
      slotId,
      slotDateLabel,
      slotTime,
      calendlyEventUri,
      calendlyInviteeUri,
      scheduledAt,
      bookingSource,
    } = req.body;

    if (
      !fullName?.trim() ||
      !businessName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !industry ||
      !priority ||
      !paymentGatewayId?.trim() ||
      !slotId?.trim()
    ) {
      return res.status(400).json({
        message:
          "Full name, business name, email, phone, industry, priority, payment gateway, and time slot are required",
      });
    }

    const allowedBookingSources = ["manual", "calendly"];
    const normalizedBookingSource = allowedBookingSources.includes(bookingSource)
      ? bookingSource
      : calendlyEventUri
        ? "calendly"
        : "manual";

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const phoneError = validateMobilePhone(phone);
    if (phoneError) {
      return res.status(400).json({ message: phoneError });
    }

    if (!EXPERT_INDUSTRY_VALUES.includes(industry)) {
      return res.status(400).json({ message: "Invalid industry value" });
    }

    if (!EXPERT_PRIORITY_VALUES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority value" });
    }

    const provider = await PaymentProvider.findById(paymentGatewayId);
    if (!provider) {
      return res.status(400).json({ message: "Selected payment gateway is unavailable" });
    }
    const selectedExpert = expertId
      ? resolvePgExperts(provider).find(
          (expert) => expert.id === expertId && expert.status === "active",
        )
      : null;
    if (expertId && !selectedExpert) {
      return res.status(400).json({ message: "Selected expert is unavailable" });
    }

    const booking = await ExpertBooking.create({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: getPhoneDigits(phone),
      website: website?.trim() || "",
      industry,
      priority,
      paymentGatewayId: paymentGatewayId.trim(),
      paymentGatewayName:
        provider.onboarding?.brandName ||
        provider.companyName ||
        paymentGatewayName?.trim() ||
        paymentGatewayId.trim(),
      expertId: expertId?.trim() || null,
      representativeName:
        selectedExpert?.name || representativeName?.trim() || null,
      representativeTitle:
        selectedExpert?.designation || representativeTitle?.trim() || null,
      slotId: slotId.trim(),
      slotDateLabel: slotDateLabel?.trim() || null,
      slotTime: slotTime?.trim() || null,
      calendlyEventUri: calendlyEventUri?.trim() || null,
      calendlyInviteeUri: calendlyInviteeUri?.trim() || null,
      scheduledAt: scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime())
        ? new Date(scheduledAt)
        : null,
      bookingSource: normalizedBookingSource,
      status: "new",
      source: "talk-to-expert",
    });

    return res.status(201).json({
      id: booking._id.toString(),
      message: "Your expert call has been booked successfully",
      expertBooking: ExpertBooking.sanitize(booking),
    });
  } catch (error) {
    console.error("Submit expert booking error:", error);
    return res.status(500).json({ message: "Failed to book expert call" });
  }
}

export async function updateExpertBookingStatus(req, res) {
  try {
    const booking = await ExpertBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Expert booking not found" });
    }

    const { status } = req.body;
    if (!EXPERT_BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${EXPERT_BOOKING_STATUSES.join(", ")}`,
      });
    }

    const result = await ExpertBooking.updateById(booking._id, { status });

    if (!result.updated) {
      return res.status(404).json({ message: "Expert booking not found" });
    }

    return res.json({
      message: `Booking marked as ${status}`,
      expertBooking: ExpertBooking.sanitize(result.updated),
    });
  } catch (error) {
    console.error("Update expert booking status error:", error);
    return res.status(500).json({ message: "Failed to update booking status" });
  }
}

export async function deleteExpertBooking(req, res) {
  try {
    const result = await ExpertBooking.deleteById(req.params.id);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    if (!result.deleted) {
      return res.status(404).json({ message: "Expert booking not found" });
    }

    return res.json({ message: "Expert booking deleted successfully" });
  } catch (error) {
    console.error("Delete expert booking error:", error);
    return res.status(500).json({ message: "Failed to delete expert booking" });
  }
}
