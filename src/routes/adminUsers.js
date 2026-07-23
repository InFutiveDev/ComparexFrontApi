import { Router } from "express";
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../controllers/adminUserController.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { requireUsersManage } from "../middleware/permissions.js";

const router = Router();

router.use(authMiddleware, requireAdmin, requireUsersManage);

router.get("/", listAdminUsers);
router.post("/", createAdminUser);
router.patch("/:id", updateAdminUser);

export { router as adminUsersRouter };
