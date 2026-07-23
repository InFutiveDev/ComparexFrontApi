import { Router } from "express";
import { adminMdrRouter } from "./adminMdr.js";
import { adminSettingsRouter } from "./adminSettings.js";
import { adminUsersRouter } from "./adminUsers.js";
import { authRouter } from "./auth.js";
import { expertRouter } from "./expert.js";
import { merchantRouter } from "./merchant.js";
import { notificationRouter } from "./notifications.js";
import { paymentRouter } from "./payment.js";
import { pgExpertRouter } from "./pgExpert.js";
import { pgLeadsRouter } from "./pgLeads.js";
import { resellerRouter } from "./reseller.js";
import { reviewRouter } from "./review.js";
import { subAdminRouter } from "./subAdmin.js";
import { supportRouter } from "./support.js";
import { uploadRouter } from "./upload.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ name: "comparex-front-api", version: "1.0.0" });
});

router.use("/auth", authRouter);
router.use("/admin/settings", adminSettingsRouter);
router.use("/admin/users", adminUsersRouter);
router.use("/admin/mdr", adminMdrRouter);
router.use("/merchant", merchantRouter);
router.use("/notifications", notificationRouter);
router.use("/payment", paymentRouter);
router.use("/pg-experts", pgExpertRouter);
router.use("/pg/leads", pgLeadsRouter);
router.use("/reseller", resellerRouter);
router.use("/support", supportRouter);
router.use("/expert", expertRouter);
router.use("/review", reviewRouter);
router.use("/sub-admin", subAdminRouter);
router.use("/upload", uploadRouter);

export { router as apiRouter };
