import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";

export const UPLOADS_DIR = process.env.UPLOADS_DIR || "/app/uploads";
export const MAX_PHOTOS_PER_ENTRY = 4;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadPhotos = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: MAX_PHOTOS_PER_ENTRY },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, GIF, or WEBP images are allowed"));
    }
    cb(null, true);
  },
});

export function deletePhotoFile(filename) {
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.unlink(filePath, () => {});
}

export function photoMimeFromFilename(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

export function readPhotoBase64(filename) {
  return fs.readFileSync(path.join(UPLOADS_DIR, filename)).toString("base64");
}

export function writePhotoFromBase64(mime, base64Data) {
  const ext = EXT_BY_MIME[mime];
  if (!ext || typeof base64Data !== "string") return null;
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(base64Data, "base64"));
  return filename;
}
