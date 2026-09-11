import fs from "node:fs";
import path from "node:path";
import { one, run } from "../db";
import { newId } from "../ids";

export const ALLOWED_MIME = ["image/jpeg", "image/png", "application/pdf"];
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export interface DocumentRow {
  id: string;
  filename: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_id: string;
  created_at: string;
}

/** Saves a file OUTSIDE /public so it can never be fetched without going through the authenticated API route. */
export async function saveUploadedFile(params: { file: File; uploadedById: string }): Promise<DocumentRow> {
  if (!ALLOWED_MIME.includes(params.file.type)) {
    throw new Error("Only JPG, PNG and PDF files are accepted.");
  }
  if (params.file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 8MB).");
  }
  const id = newId("doc");
  const ext = params.file.type === "application/pdf" ? "pdf" : params.file.type === "image/png" ? "png" : "jpg";
  const storedName = `${id}.${ext}`;
  const storedPath = path.join(UPLOAD_DIR, storedName);

  const buf = Buffer.from(await params.file.arrayBuffer());
  fs.writeFileSync(storedPath, buf);

  run(
    `INSERT INTO documents (id, filename, stored_path, mime_type, size_bytes, uploaded_by_id)
     VALUES (:id, :filename, :storedPath, :mimeType, :sizeBytes, :uploadedById)`,
    {
      id,
      filename: params.file.name.slice(0, 200),
      storedPath: storedName, // store relative name only
      mimeType: params.file.type,
      sizeBytes: params.file.size,
      uploadedById: params.uploadedById,
    }
  );

  return one<DocumentRow>(`SELECT * FROM documents WHERE id = :id`, { id })!;
}

export function getDocument(id: string): DocumentRow | undefined {
  return one<DocumentRow>(`SELECT * FROM documents WHERE id = :id`, { id });
}

export function resolveDocumentPath(doc: DocumentRow): string {
  return path.join(UPLOAD_DIR, doc.stored_path);
}
