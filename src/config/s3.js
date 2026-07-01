export const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "";
export const AWS_S3_FOLDER = process.env.AWS_S3_FOLDER || "uploads";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const UPLOAD_MAX_FILE_SIZE_MB = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 10;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
