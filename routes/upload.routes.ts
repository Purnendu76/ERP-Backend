import { Router } from "express";
import multer from "multer";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

import { b2Client } from "../config/b2.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const bucketName = process.env.B2_BUCKET_NAME || "";

router.post("/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const folder = String(req.body.folder || "uploads");
    const safeFileName = req.file.originalname.replace(/\s+/g, "-");
    const fileKey = `${folder}/${Date.now()}-${safeFileName}`;

    await b2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const publicUrl = `https://${bucketName}.s3.${process.env.B2_REGION}.backblazeb2.com/${fileKey}`;

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        key: fileKey,
        url: publicUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("B2 upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
    });
  }
});

router.get("/file-url", async (req, res) => {
  try {
    const key = String(req.query.key || "");

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "File key is required",
      });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(b2Client, command, {
      expiresIn: 60 * 10,
    });

    return res.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("B2 signed URL error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate file URL",
    });
  }
});

router.delete("/file", async (req, res) => {
  try {
    const key = String(req.body.key || "");

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "File key is required",
      });
    }

    await b2Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("B2 delete error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete file",
    });
  }
});

export default router;