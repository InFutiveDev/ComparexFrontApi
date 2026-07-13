import { Router } from "express";
import multer from "multer";
import {
  assignLeadToPg,
  bookTalkToExpert,
  bulkUploadLeadsToPg,
  getLeadDetail,
  getSubAdminOptions,
  listAssignablePgs,
  listLeads,
  listPgNotifications,
  updateLeadStatus,
} from "../controllers/subAdminController.js";
import { authMiddleware, requireSubAdmin } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authMiddleware, requireSubAdmin);

router.get("/options", getSubAdminOptions);
router.get("/leads", listLeads);
router.post("/leads/bulk-upload", upload.single("file"), bulkUploadLeadsToPg);
router.get("/leads/:id", getLeadDetail);
router.patch("/leads/:id/status", updateLeadStatus);
router.post("/leads/:id/assign", assignLeadToPg);
router.post("/leads/:id/talk-to-expert", bookTalkToExpert);
router.get("/payment-gateways", listAssignablePgs);
router.get("/notifications", listPgNotifications);

export { router as subAdminRouter };
