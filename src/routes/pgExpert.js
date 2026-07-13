import { Router } from "express";
import {
  createPgExpert,
  deletePgExpert,
  getPgExpertById,
  getPgExpertOptions,
  listPgExperts,
  updatePgExpert,
} from "../controllers/pgExpertController.js";
import { authMiddleware, requireSubAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/options", getPgExpertOptions);
router.get("/", authMiddleware, requireSubAdmin, listPgExperts);
router.get("/:id", authMiddleware, requireSubAdmin, getPgExpertById);
router.post("/", authMiddleware, requireSubAdmin, createPgExpert);
router.patch("/:id", authMiddleware, requireSubAdmin, updatePgExpert);
router.delete("/:id", authMiddleware, requireSubAdmin, deletePgExpert);

export { router as pgExpertRouter };
