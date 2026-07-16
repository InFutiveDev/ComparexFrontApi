import { Router } from "express";
import {
  getAdminMdrSettings,
  listAdminMdrAudit,
  updateAdminGlobalMdr,
  updateAdminMdrTiers,
} from "../controllers/adminMdrController.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get("/", getAdminMdrSettings);
router.put("/global", updateAdminGlobalMdr);
router.put("/tiers", updateAdminMdrTiers);
router.get("/audit", listAdminMdrAudit);

export { router as adminMdrRouter };
