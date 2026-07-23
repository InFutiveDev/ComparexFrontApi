import { Router } from "express";
import {
  deleteReview,
  getAllReviews,
  getReviewById,
  submitReview,
  submitWebsiteReview,
  submitMerchantReview,
  updateReviewStatus,
} from "../controllers/reviewController.js";
import {
  authMiddleware,
  requireAdmin,
  requireMerchant,
} from "../middleware/auth.js";

const router = Router();

router.post("/", submitReview);
router.post("/website", submitWebsiteReview);
router.post("/merchant", authMiddleware, requireMerchant, submitMerchantReview);
router.get("/", authMiddleware, requireAdmin, getAllReviews);
router.get("/:id", authMiddleware, requireAdmin, getReviewById);
router.patch("/:id/status", authMiddleware, requireAdmin, updateReviewStatus);
router.delete("/:id", authMiddleware, requireAdmin, deleteReview);

export { router as reviewRouter };
