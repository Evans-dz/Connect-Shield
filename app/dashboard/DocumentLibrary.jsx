"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/auth/client";
import {
  Upload,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  HardDrive,
} from "lucide-react";

// ── Config ────────────────────────────────────────────────
const BUCKET = "clinic-docs";
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB Supabase free tier

// ── Palette (navy) ────────────────────────────────────────
const NAVY = "#0B1F3A";
const NAVY_SOFT = "#14315C";
const BORDER = "#E2E8F0";
const MUTED = "#64748B";
const DANGER = "#DC2626";
const BG_SOFT = "#F8FAFC";

// ── Helpers ───────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

function iconFor(mime, name) {
  const m = (mime || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(n)) return ImageIcon;
  if (m === "application/pdf" || n.endsWith(".pdf")) return FileText;
  return FileIcon;
}

// ── Component ─────────────────────────────────────────────
export default function DocumentLibrary({ clinicId }) {
  const [supabase] = useState(() => createClient());
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const totalBytes = docs.reduce((sum, d) => sum + (d.file_size || 0), 0);
  const pctUsed = Math.min(100, (totalBytes / STORAGE_LIMIT_BYTES) * 100);

  const loadDocs = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("clinic_documents")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setDocs(data || []);
    setLoading(false);
  }, [supabase, clinicId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length || !clinicId) return;
      setUploading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in. Please refresh and sign in again.");
        setUploading(false);
        return;
      }

      for (const file of files) {
        const path = `${clinicId}/${Date.now()}_${sanitizeName(file.name)}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upErr) {
          setError(`Upload failed for ${file.name}: ${upErr.message}`);
          continue;
        }

        const { error: rowErr } = await supabase.from("clinic_documents").insert({
          clinic_id: clinicId,
          uploaded_by: user.id,
          file_name: file.name,
          storage_path: path,
          file_size: file.size,
          mime_type: file.type || null,
        });

        // If the metadata row fails (e.g. RLS), roll back the orphaned object.
        if (rowErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          setError(`Could not save ${file.name}: ${rowErr.message}`);
        }
      }

      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      loadDocs();
    },
    [supabase, clinicId, loadDocs]
  );

  const download = useCallback(
    async (doc) => {
      setError("");
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
      if (error || !data?.signedUrl) {
        setError(`Could not open ${doc.file_name}: ${error?.message || "unknown error"}`);
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    },
    [supabase]
  );

  const remove = useCallback(
    async (doc) => {
      if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
      setError("");
      // Storage first: if this fails, the row survives as a recoverable pointer
      // rather than leaving an invisible orphan file eating your quota.
      const { error: sErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      if (sErr) {
        setError(`Could not delete file: ${sErr.message}`);
        return;
      }
      const { error: rErr } = await supabase.from("clinic_documents").delete().eq("id", doc.id);
      if (rErr) setError(`File removed, but record delete failed: ${rErr.message}`);
      loadDocs();
    },
    [supabase, loadDocs]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!uploading) handleFiles(e.dataTransfer.files);
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header + usage */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: NAVY, fontSize: 22, fontWeight: 700 }}>
            Document Library
          </h2>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 14 }}>
            Secure per-clinic storage. Files are private to your agency.
          </p>
        </div>

        <div style={{ minWidth: 220 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: MUTED,
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <HardDrive size={14} />
            <span>
              {formatBytes(totalBytes)} of 1 GB used
            </span>
          </div>
          <div style={{ height: 6, background: BORDER, borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                width: `${pctUsed}%`,
                height: "100%",
                background: pctUsed > 90 ? DANGER : NAVY_SOFT,
                transition: "width 240ms ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#FEF2F2",
            border: `1px solid #FECACA`,
            color: DANGER,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? NAVY_SOFT : BORDER}`,
          background: dragOver ? "#EEF3FA" : BG_SOFT,
          borderRadius: 14,
          padding: "34px 20px",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          transition: "all 160ms ease",
          marginBottom: 24,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Loader2 size={26} color={NAVY_SOFT} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ color: NAVY, fontWeight: 600 }}>Uploading…</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Upload size={26} color={NAVY_SOFT} />
            <span style={{ color: NAVY, fontWeight: 600, fontSize: 15 }}>
              Drop files here or click to upload
            </span>
            <span style={{ color: MUTED, fontSize: 13 }}>Any file type · stored securely</span>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: MUTED }}>
          <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ marginTop: 8, fontSize: 14 }}>Loading documents…</div>
        </div>
      ) : docs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            color: MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            background: "#fff",
          }}
        >
          <FileText size={30} color={BORDER} />
          <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: NAVY }}>
            No documents yet
          </div>
          <div style={{ marginTop: 4, fontSize: 13 }}>Upload your first file to get started.</div>
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {docs.map((doc, idx) => {
            const Icon = iconFor(doc.mime_type, doc.file_name);
            return (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`,
                }}
              >
                <Icon size={22} color={NAVY_SOFT} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: NAVY,
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={doc.file_name}
                  >
                    {doc.file_name}
                  </div>
                  <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                    {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => download(doc)}
                  title="Download"
                  style={iconBtn(NAVY_SOFT)}
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => remove(doc)}
                  title="Delete"
                  style={iconBtn(DANGER)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function iconBtn(color) {
  return {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color,
    padding: 8,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}
