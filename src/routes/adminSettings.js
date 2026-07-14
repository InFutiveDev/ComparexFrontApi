import { Router } from "express";
import {
  getAdminFeeSettings,
  getAdminPermissionSettings,
  getAdminPayoutSettings,
  getAdminSettings,
  updateAdminFeeSettings,
  updateAdminPermissionSettings,
  updateAdminPayoutSettings,
} from "../controllers/adminSettingsController.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get("/", getAdminSettings);
router.get("/fees", getAdminFeeSettings);
router.put("/fees", updateAdminFeeSettings);
router.get("/permissions", getAdminPermissionSettings);
router.put("/permissions", updateAdminPermissionSettings);
router.get("/payouts", getAdminPayoutSettings);
router.put("/payouts", updateAdminPayoutSettings);

export { router as adminSettingsRouter };
