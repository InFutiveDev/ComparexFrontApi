import { Router } from "express";
import {
  getSupportFormOptions,
  submitSupportRequest,
} from "../controllers/supportController.js";
import { handleUploadError } from "../controllers/uploadController.js";
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
router.post("/", runUpload(uploadSupportAttachments), submitSupportRequest);

export { router as supportRouter };
