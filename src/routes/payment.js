import { Router } from "express";
import {
  deletePaymentGateway,
  getAllPaymentGateways,
  getFormOptions,
  getPaymentGatewayById,
  submitPaymentForm,
  updatePaymentAccountStatus,
  updatePaymentForm,
} from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllPaymentGateways);
router.get("/:id", authMiddleware, getPaymentGatewayById);
router.post("/", submitPaymentForm);
router.patch("/:id/account-status", authMiddleware, updatePaymentAccountStatus);
router.patch("/:id", updatePaymentForm);
router.delete("/:id", authMiddleware, deletePaymentGateway);

export { router as paymentRouter };
