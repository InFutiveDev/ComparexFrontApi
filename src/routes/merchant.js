import { Router } from "express";
import { getFormOptions, submitMerchantForm } from "../controllers/merchantController.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.post("/", submitMerchantForm);

export { router as merchantRouter };
