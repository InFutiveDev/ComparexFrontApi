import { Router } from "express";
import {
  deleteReseller,
  getAllResellers,
  getFormOptions,
  getMyResellerProfile,
  getResellerById,
  submitResellerForm,
  updateMyResellerProfile,
  updateResellerAccountStatus,
  updateResellerForm,
  updateResellerVerificationStatus,
} from "../controllers/resellerController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/me", authMiddleware, getMyResellerProfile);
router.patch("/me", authMiddleware, updateMyResellerProfile);
router.get("/", authMiddleware, getAllResellers);
router.get("/:id", authMiddleware, getResellerById);
router.post("/", submitResellerForm);
router.patch("/:id/account-status", authMiddleware, updateResellerAccountStatus);
router.patch("/:id/verification-status", authMiddleware, updateResellerVerificationStatus);
router.patch("/:id", updateResellerForm);
router.delete("/:id", authMiddleware, deleteReseller);

export { router as resellerRouter };
