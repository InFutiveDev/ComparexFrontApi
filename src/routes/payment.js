import { Router } from "express";
import { getFormOptions, submitPaymentForm } from "../controllers/paymentController.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.post("/", submitPaymentForm);

export { router as paymentRouter };
