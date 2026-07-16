import { Router } from "express";
import { listMyNotifications } from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/me", authMiddleware, listMyNotifications);

export { router as notificationRouter };
