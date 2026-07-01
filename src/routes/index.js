import { Router } from "express";
import { authRouter } from "./auth.js";
import { merchantRouter } from "./merchant.js";
import { paymentRouter } from "./payment.js";
import { resellerRouter } from "./reseller.js";
import { supportRouter } from "./support.js";
import { uploadRouter } from "./upload.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ name: "comparex-front-api", version: "1.0.0" });
});

router.use("/auth", authRouter);
router.use("/merchant", merchantRouter);
router.use("/payment", paymentRouter);
router.use("/reseller", resellerRouter);
router.use("/support", supportRouter);
router.use("/upload", uploadRouter);

export { router as apiRouter };
