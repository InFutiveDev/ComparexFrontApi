import { Router } from "express";
import {
  adminOnboardPaymentGateway,
  deletePaymentGateway,
  getAllPaymentGateways,
  getFormOptions,
  getMyPaymentProfile,
  getPaymentGatewayById,
  submitPaymentForm,
  updateMyPaymentProfile,
  updatePaymentAccountStatus,
  updatePaymentForm,
  updatePaymentOnboardingDocuments,
  updatePaymentVerificationStatus,
} from "../controllers/paymentController.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/me", authMiddleware, getMyPaymentProfile);
router.patch("/me", authMiddleware, updateMyPaymentProfile);
router.post("/admin", authMiddleware, requireAdmin, adminOnboardPaymentGateway);
router.get("/", authMiddleware, getAllPaymentGateways);
router.get("/:id", authMiddleware, getPaymentGatewayById);
router.post("/", submitPaymentForm);
router.patch("/:id/account-status", authMiddleware, updatePaymentAccountStatus);
router.patch(
  "/:id/verification-status",
  authMiddleware,
  requireAdmin,
  updatePaymentVerificationStatus,
);
router.patch(
  "/:id/documents",
  authMiddleware,
  requireAdmin,
  updatePaymentOnboardingDocuments,
);
router.patch("/:id", updatePaymentForm);
router.delete("/:id", authMiddleware, deletePaymentGateway);

export { router as paymentRouter };
