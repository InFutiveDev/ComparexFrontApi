import { Router } from "express";
import {
  deleteReseller,
  getAllResellers,
  getFormOptions,
  submitResellerForm,
  updateResellerAccountStatus,
  updateResellerForm,
} from "../controllers/resellerController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllResellers);
router.post("/", submitResellerForm);
router.patch("/:id/account-status", authMiddleware, updateResellerAccountStatus);
router.patch("/:id", updateResellerForm);
router.delete("/:id", authMiddleware, deleteReseller);

export { router as resellerRouter };
