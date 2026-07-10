import { Router } from "express";
import {
  deleteMerchantSupport,
  getAllMerchantSupport,
  getMerchantSupportById,
  getSupportFormOptions,
  submitSupportRequest,
} from "../controllers/supportController.js";
import { handleUploadError } from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadSupportAttachments } from "../middleware/upload.js";

const router = Router();

function runUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (error) {
        return handleUploadError(error, res);
      }

      return next();
    });
  };
}

router.get("/form-options", getSupportFormOptions);
router.get("/", authMiddleware, getAllMerchantSupport);
router.get("/:id", authMiddleware, getMerchantSupportById);
router.post("/", runUpload(uploadSupportAttachments), submitSupportRequest);
router.delete("/:id", authMiddleware, deleteMerchantSupport);

export { router as supportRouter };
