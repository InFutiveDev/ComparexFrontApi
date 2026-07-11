import { Router } from "express";
import {
  deleteReview,
  getAllReviews,
  getReviewById,
  submitReview,
  updateReviewStatus,
} from "../controllers/reviewController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/", submitReview);
router.get("/", authMiddleware, getAllReviews);
router.get("/:id", authMiddleware, getReviewById);
router.patch("/:id/status", authMiddleware, updateReviewStatus);
router.delete("/:id", authMiddleware, deleteReview);

export { router as reviewRouter };
