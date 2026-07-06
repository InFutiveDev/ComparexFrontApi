import { Router } from "express";
import {
  getAllResellers,
  getFormOptions,
  submitResellerForm,
} from "../controllers/resellerController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.get("/", authMiddleware, getAllResellers);
router.post("/", submitResellerForm);

export { router as resellerRouter };
