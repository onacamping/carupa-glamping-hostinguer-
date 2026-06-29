import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";
import type { Response } from "express";

const SIDECAR = "http://127.0.0.1:1106";

function getBucketId(): string {
  return process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
}

function createGCSClient(): Storage {
  return new Storage({
    credentials: {
      type: "external_account",
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${SIDECAR}/token`,
      credential_source: {
        url: `${SIDECAR}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    } as any,
    projectId: "",
  });
}

function extToContentType(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".mp4":
    case ".mov":  return "video/mp4";
    case ".webm": return "video/webm";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png":  return "image/png";
    case ".webp": return "image/webp";
    case ".gif":  return "image/gif";
    default:      return "application/octet-stream";
  }
}

/**
 * Upload a local file to GCS.
 * gcsSubpath e.g. "images/banners/banner-123.jpg"
 * Stored in bucket under "public/images/banners/banner-123.jpg"
 */
export async function uploadToObjectStorage(localPath: string, gcsSubpath: string): Promise<void> {
  const bucketId = getBucketId();
  if (!bucketId) {
    console.warn("[gcs] SKIP — DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
    return;
  }
  const objectName = `public/${gcsSubpath}`;
  console.log(`[gcs] UPLOAD  src=${path.basename(localPath)}  dst=${objectName}`);
  try {
    const storage = createGCSClient();
    await storage.bucket(bucketId).upload(localPath, { destination: objectName });
    console.log(`[gcs] OK  dst=${objectName}`);
  } catch (e: any) {
    console.error(`[gcs] UPLOAD FAIL  dst=${objectName}  err=${e.message}`);
    throw e;
  }
}

/**
 * Migrate all existing local media files to GCS on startup.
 * Skips files that already exist in GCS. Safe to call on every startup.
 * Only touches: images/banners/, images/addons/, images/campings/
 */
export async function migrateLocalFilesToObjectStorage(publicDir: string): Promise<void> {
  const bucketId = getBucketId();
  if (!bucketId) {
    console.warn("[gcs] SKIP migration — DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
    return;
  }

  const uploadDirs = ["images/banners", "images/addons", "images/campings"];
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const dir of uploadDirs) {
    const localDir = path.join(publicDir, dir);
    if (!fs.existsSync(localDir)) continue;

    const files = fs.readdirSync(localDir).filter(f => !f.startsWith(".") && !f.includes(".tmp"));
    for (const filename of files) {
      const localPath = path.join(localDir, filename);
      const stat = fs.statSync(localPath);
      if (!stat.isFile()) continue;

      const gcsSubpath = `${dir}/${filename}`;
      const objectName = `public/${gcsSubpath}`;

      try {
        const storage = createGCSClient();
        const [exists] = await storage.bucket(bucketId).file(objectName).exists();
        if (exists) {
          skipped++;
          continue;
        }
        await storage.bucket(bucketId).upload(localPath, { destination: objectName });
        uploaded++;
        console.log(`[gcs] MIGRATED  ${gcsSubpath}`);
      } catch (e: any) {
        failed++;
        console.error(`[gcs] MIGRATE FAIL  ${gcsSubpath}  err=${e.message}`);
      }
    }
  }

  console.log(`[gcs] Migration complete — uploaded=${uploaded}  skipped=${skipped}  failed=${failed}`);
}

/**
 * Delete a file from GCS.
 * gcsSubpath e.g. "images/banners/banner-123.jpg"
 */
export async function deleteFromObjectStorage(gcsSubpath: string): Promise<void> {
  const bucketId = getBucketId();
  if (!bucketId) return;
  const objectName = `public/${gcsSubpath}`;
  try {
    const storage = createGCSClient();
    await storage.bucket(bucketId).file(objectName).delete();
    console.log(`[gcs] DELETED  obj=${objectName}`);
  } catch (e: any) {
    console.warn(`[gcs] DELETE skip  obj=${objectName}  err=${e.message}`);
  }
}

/**
 * Stream a GCS object to an Express response.
 * gcsSubpath e.g. "images/banners/banner-123.jpg"
 * Returns true if found and streamed, false if not found.
 */
export async function streamFromObjectStorage(gcsSubpath: string, res: Response): Promise<boolean> {
  const bucketId = getBucketId();
  if (!bucketId) return false;

  const objectName = `public/${gcsSubpath}`;
  try {
    const storage = createGCSClient();
    const file = storage.bucket(bucketId).file(objectName);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`[gcs] NOT FOUND  obj=${objectName}`);
      return false;
    }

    const ext = path.extname(gcsSubpath);
    res.set({
      "Content-Type": extToContentType(ext),
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    await new Promise<void>((resolve, reject) => {
      const stream = file.createReadStream();
      stream.on("error", reject);
      stream.on("end", resolve);
      stream.pipe(res);
    });

    console.log(`[gcs] SERVED  obj=${objectName}`);
    return true;
  } catch (e: any) {
    console.error(`[gcs] STREAM FAIL  obj=${objectName}  err=${e.message}`);
    return false;
  }
}
