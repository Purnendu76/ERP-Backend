import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const b2Client = new S3Client({
  region: getEnv("B2_REGION"),
  endpoint: getEnv("B2_ENDPOINT"),
  credentials: {
    accessKeyId: getEnv("B2_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("B2_SECRET_ACCESS_KEY"),
  },
});