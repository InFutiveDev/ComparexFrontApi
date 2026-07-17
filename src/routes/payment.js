import { Router } from "express";
import {
  adminOnboardPaymentGateway,
  deletePaymentGateway,
  getAllPaymentGateways,
  getFormOptions,
  getMyPaymentProfile,
  getMyPgExperts,
  getPaymentGatewayById,
  listTalkToExpertProviders,
  submitPaymentForm,
  updateMyPaymentProfile,
  updateMyPgExperts,
  updatePaymentAccountStatus,
  updatePaymentForm,
  updatePaymentOnboardingDocuments,
  updatePaymentVerificationStatus,
} from "../controllers/paymentController.js";
import { listPgComparison } from "../controllers/pgCompareController.js";
import {
  authMiddleware,
  requireAdmin,
  requirePaymentProvider,
} from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/talk-to-expert", listTalkToExpertProviders);
router.get("/compare", listPgComparison);
router.get("/me", authMiddleware, getMyPaymentProfile);
router.patch("/me", authMiddleware, updateMyPaymentProfile);
router.get("/me/experts", authMiddleware, requirePaymentProvider, getMyPgExperts);
router.put("/me/experts", authMiddleware, requirePaymentProvider, updateMyPgExperts);
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
