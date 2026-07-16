import { Router } from "express";
import {
  exportMyPgLeads,
  getMyPgLead,
  listMyPgLeads,
  updateMyPgLeadStatus,
} from "../controllers/pgLeadController.js";
import { authMiddleware, requirePaymentProvider } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requirePaymentProvider);
router.get("/", listMyPgLeads);
router.get("/export", exportMyPgLeads);
router.get("/:id", getMyPgLead);
router.patch("/:id/status", updateMyPgLeadStatus);

export { router as pgLeadsRouter };
