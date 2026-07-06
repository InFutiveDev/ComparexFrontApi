import { Router } from "express";
import {
  deletePaymentGateway,
  getAllPaymentGateways,
  getFormOptions,
  submitPaymentForm,
} from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllPaymentGateways);
router.post("/", submitPaymentForm);
router.delete("/:id", authMiddleware, deletePaymentGateway);

export { router as paymentRouter };
