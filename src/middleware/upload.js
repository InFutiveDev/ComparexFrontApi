import multer from "multer";
import { ALLOWED_MIME_TYPES, UPLOAD_MAX_FILE_SIZE_MB } from "../config/s3.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }

    return cb(null, true);
  },
});

export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", 5);
export const uploadSupportAttachments = upload.array("attachments", 5);
