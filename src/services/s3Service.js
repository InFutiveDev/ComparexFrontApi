import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_S3_BUCKET,
  AWS_S3_FOLDER,
  AWS_SECRET_ACCESS_KEY,
} from "../config/s3.js";

function getS3Client() {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET) {
    throw new Error("S3 is not configured. Set AWS credentials and bucket in environment variables.");
  }

  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

function buildObjectKey(originalName, folder) {
  const extension = path.extname(originalName).toLowerCase();
  const safeName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const prefix = folder?.trim() || AWS_S3_FOLDER;

  return `${prefix.replace(/\/$/, "")}/${safeName}`;
}

function buildPublicUrl(key) {
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadFileToS3(file, folder) {
  const client = getS3Client();
  const key = buildObjectKey(file.originalname, folder);

  await client.send(
    new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return {
    key,
    url: buildPublicUrl(key),
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}
