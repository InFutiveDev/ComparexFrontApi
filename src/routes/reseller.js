import { Router } from "express";
import {
  deleteReseller,
  getAllResellers,
  getFormOptions,
  submitResellerForm,
  updateResellerAccountStatus,
} from "../controllers/resellerController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllResellers);
router.post("/", submitResellerForm);
router.patch("/:id/account-status", authMiddleware, updateResellerAccountStatus);
router.delete("/:id", authMiddleware, deleteReseller);

export { router as resellerRouter };
