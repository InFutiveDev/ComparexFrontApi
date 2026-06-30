import { Router } from "express";
import { getFormOptions, submitResellerForm } from "../controllers/resellerController.js";

const router = Router();

router.get("/form-options", getFormOptions);
router.post("/", submitResellerForm);

export { router as resellerRouter };
