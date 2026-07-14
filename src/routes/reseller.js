import { Router } from "express";
import {
  adminOnboardReseller,
  deleteReseller,
  getAllResellers,
  getFormOptions,
  getMyResellerProfile,
  getResellerById,
  submitResellerForm,
  updateMyResellerProfile,
  updateResellerAccountStatus,
  updateResellerForm,
  updateResellerOnboardingDocuments,
  updateResellerVerificationStatus,
} from "../controllers/resellerController.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/me", authMiddleware, getMyResellerProfile);
router.patch("/me", authMiddleware, updateMyResellerProfile);
router.post("/admin", authMiddleware, requireAdmin, adminOnboardReseller);
router.get("/", authMiddleware, getAllResellers);
router.get("/:id", authMiddleware, getResellerById);
router.post("/", submitResellerForm);
router.patch("/:id/account-status", authMiddleware, updateResellerAccountStatus);
router.patch("/:id/verification-status", authMiddleware, updateResellerVerificationStatus);
router.patch(
  "/:id/documents",
  authMiddleware,
  requireAdmin,
  updateResellerOnboardingDocuments,
);
router.patch("/:id", updateResellerForm);
router.delete("/:id", authMiddleware, deleteReseller);

export { router as resellerRouter };
