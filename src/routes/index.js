import { Router } from "express";
import { authRouter } from "./auth.js";
import { merchantRouter } from "./merchant.js";
import { paymentRouter } from "./payment.js";
import { resellerRouter } from "./reseller.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ name: "comparex-front-api", version: "1.0.0" });
});

router.use("/auth", authRouter);
router.use("/merchant", merchantRouter);
router.use("/payment", paymentRouter);
router.use("/reseller", resellerRouter);

export { router as apiRouter };
