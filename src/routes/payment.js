import { Router } from "express";
import {
  getAllPaymentGateways,
  getFormOptions,
  submitPaymentForm,
} from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllPaymentGateways);
router.post("/", submitPaymentForm);

export { router as paymentRouter };
