import { Router } from "express";
import { login, me, refresh, register } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", authMiddleware, me);

export { authMiddleware, router as authRouter };
