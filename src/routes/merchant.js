import { Router } from "express";
import {
  deleteMerchantGateway,
  getAllMerchantGateways,
  getFormOptions,
  submitMerchantForm,
  updateMerchantAccountStatus,
  updateMerchantForm,
} from "../controllers/merchantController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllMerchantGateways);
router.post("/", submitMerchantForm);
router.patch("/:id/account-status", authMiddleware, updateMerchantAccountStatus);
router.patch("/:id", updateMerchantForm);
router.delete("/:id", authMiddleware, deleteMerchantGateway);

export { router as merchantRouter };
