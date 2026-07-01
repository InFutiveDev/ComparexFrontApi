import { uploadFileToS3 } from "../services/s3Service.js";

export function handleUploadError(error, res) {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File size exceeds the allowed limit" });
  }

  if (error?.message === "Unsupported file type") {
    return res.status(400).json({ message: "Unsupported file type" });
  }

  if (error?.message?.includes("S3 is not configured")) {
    return res.status(500).json({ message: "File upload service is not configured" });
  }

  console.error("Upload error:", error);
  return res.status(500).json({ message: "Failed to upload file" });
}

export async function uploadSingleFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required. Use form field name: file" });
    }

    const uploaded = await uploadFileToS3(req.file, req.body.folder);

    return res.status(201).json({
      message: "File uploaded successfully",
      file: uploaded,
    });
  } catch (error) {
    return handleUploadError(error, res);
  }
}

export async function uploadMultipleFiles(req, res) {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: "At least one file is required. Use form field name: files" });
    }

    const uploads = await Promise.all(
      req.files.map((file) => uploadFileToS3(file, req.body.folder)),
    );

    return res.status(201).json({
      message: "Files uploaded successfully",
      files: uploads,
    });
  } catch (error) {
    return handleUploadError(error, res);
  }
}
