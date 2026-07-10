import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_S3_BUCKET,
  AWS_S3_FOLDER,
  AWS_SECRET_ACCESS_KEY,
} from "../config/s3.js";

const SIGNED_URL_EXPIRES_IN = Number(process.env.AWS_SIGNED_URL_EXPIRES_IN) || 60 * 60;

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

export async function getSignedDownloadUrl(key, expiresIn = SIGNED_URL_EXPIRES_IN) {
  if (!key) return null;

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function withSignedAttachmentUrls(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  return Promise.all(
    attachments.map(async (file) => {
      if (typeof file === "string") {
        return { url: file, fileName: file.split("/").pop() };
      }

      const key = file?.key;
      let url = file?.url || null;

      if (key) {
        try {
          url = await getSignedDownloadUrl(key);
        } catch (error) {
          console.error("Failed to sign attachment URL:", error.message);
        }
      }

      return {
        ...file,
        url,
      };
    }),
  );
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

  let url = buildPublicUrl(key);
  try {
    url = await getSignedDownloadUrl(key);
  } catch (error) {
    console.error("Failed to sign uploaded file URL:", error.message);
  }

  return {
    key,
    url,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}
