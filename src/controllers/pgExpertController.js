import { PG_DOMAINS, normalizePgDomain } from "../constants/pgExpert.js";
import { PgExpertRepresentative } from "../models/PgExpertRepresentative.js";
import { getPhoneDigits, validateEmail, validateMobilePhone } from "../utils/validation.js";
import { parseObjectId } from "../utils/objectId.js";

export function getPgExpertOptions(_req, res) {
  return res.json({
    pgDomains: PG_DOMAINS.map((value) => ({ value, label: value })),
    statuses: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  });
}

export async function listPgExperts(req, res) {
  try {
    const { page, limit, pgDomain, search, status } = req.query;
    const result = await PgExpertRepresentative.findAll({
      page,
      limit,
      pgDomain,
      search,
      status,
    });

    return res.json({
      representatives: result.items.map(PgExpertRepresentative.sanitize),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("List PG experts error:", error);
    return res.status(500).json({ message: "Failed to fetch PG expert representatives" });
  }
}

export async function getPgExpertById(req, res) {
  try {
    const representative = await PgExpertRepresentative.findById(req.params.id);

    if (!representative) {
      return res.status(404).json({ message: "PG expert representative not found" });
    }

    return res.json({
      representative: PgExpertRepresentative.sanitize(representative),
    });
  } catch (error) {
    console.error("Get PG expert error:", error);
    return res.status(500).json({ message: "Failed to fetch PG expert representative" });
  }
}

export async function createPgExpert(req, res) {
  try {
    const { name, email, phone, pgDomain, title, notes, paymentProviderId, status } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !pgDomain?.trim()) {
      return res.status(400).json({
        message: "Name, email, phone, and PG domain are required",
      });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const phoneError = validateMobilePhone(phone);
    if (phoneError) {
      return res.status(400).json({ message: phoneError });
    }

    const normalizedDomain = normalizePgDomain(pgDomain);
    if (!normalizedDomain) {
      return res.status(400).json({ message: "PG domain is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await PgExpertRepresentative.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        message: "A representative with this email already exists",
      });
    }

    let linkedProviderId = null;
    if (paymentProviderId) {
      linkedProviderId = parseObjectId(paymentProviderId);
      if (!linkedProviderId) {
        return res.status(400).json({ message: "Invalid paymentProviderId" });
      }
    }

    const representative = await PgExpertRepresentative.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: getPhoneDigits(phone),
      pgDomain: normalizedDomain,
      title: title?.trim() || null,
      notes: notes?.trim() || null,
      paymentProviderId: linkedProviderId,
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      message: "PG expert representative created successfully",
      representative: PgExpertRepresentative.sanitize(representative),
    });
  } catch (error) {
    console.error("Create PG expert error:", error);
    return res.status(500).json({ message: "Failed to create PG expert representative" });
  }
}

export async function updatePgExpert(req, res) {
  try {
    const existing = await PgExpertRepresentative.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "PG expert representative not found" });
    }

    const { name, email, phone, pgDomain, title, notes, paymentProviderId, status } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const duplicate = await PgExpertRepresentative.findByEmail(normalizedEmail);
      if (duplicate && duplicate._id.toString() !== existing._id.toString()) {
        return res.status(409).json({ message: "A representative with this email already exists" });
      }
      updates.email = normalizedEmail;
    }

    if (phone !== undefined) {
      const phoneError = validateMobilePhone(phone);
      if (phoneError) {
        return res.status(400).json({ message: phoneError });
      }
      updates.phone = getPhoneDigits(phone);
    }

    if (pgDomain !== undefined) {
      const normalizedDomain = normalizePgDomain(pgDomain);
      if (!normalizedDomain) {
        return res.status(400).json({ message: "PG domain cannot be empty" });
      }
      updates.pgDomain = normalizedDomain;
    }

    if (title !== undefined) updates.title = title?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (status !== undefined) {
      updates.status = status === "inactive" ? "inactive" : "active";
    }

    if (paymentProviderId !== undefined) {
      if (!paymentProviderId) {
        updates.paymentProviderId = null;
      } else {
        const linkedProviderId = parseObjectId(paymentProviderId);
        if (!linkedProviderId) {
          return res.status(400).json({ message: "Invalid paymentProviderId" });
        }
        updates.paymentProviderId = linkedProviderId;
      }
    }

    const result = await PgExpertRepresentative.updateById(req.params.id, updates);
    if (!result.updated) {
      return res.status(404).json({ message: "PG expert representative not found" });
    }

    return res.json({
      message: "PG expert representative updated successfully",
      representative: PgExpertRepresentative.sanitize(result.updated),
    });
  } catch (error) {
    console.error("Update PG expert error:", error);
    return res.status(500).json({ message: "Failed to update PG expert representative" });
  }
}

export async function deletePgExpert(req, res) {
  try {
    const result = await PgExpertRepresentative.deleteById(req.params.id);

    if (result.invalid) {
      return res.status(400).json({ message: "Invalid representative id" });
    }

    if (!result.deleted) {
      return res.status(404).json({ message: "PG expert representative not found" });
    }

    return res.json({ message: "PG expert representative deleted successfully" });
  } catch (error) {
    console.error("Delete PG expert error:", error);
    return res.status(500).json({ message: "Failed to delete PG expert representative" });
  }
}
