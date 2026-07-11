import { Router } from "express";
import {
  deleteExpertBooking,
  getAllExpertBookings,
  getExpertBookingById,
  submitExpertBooking,
  updateExpertBookingStatus,
} from "../controllers/expertController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/", submitExpertBooking);
router.get("/", authMiddleware, getAllExpertBookings);
router.get("/:id", authMiddleware, getExpertBookingById);
router.patch("/:id/status", authMiddleware, updateExpertBookingStatus);
router.delete("/:id", authMiddleware, deleteExpertBooking);

export { router as expertRouter };
