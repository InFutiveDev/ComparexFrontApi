import { Router } from "express";
import {
  handleUploadError,
  uploadMultipleFiles,
  uploadSingleFile,
} from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadMultiple, uploadSingle } from "../middleware/upload.js";

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

router.post("/", authMiddleware, runUpload(uploadSingle), uploadSingleFile);
router.post("/multiple", authMiddleware, runUpload(uploadMultiple), uploadMultipleFiles);

export { router as uploadRouter };
