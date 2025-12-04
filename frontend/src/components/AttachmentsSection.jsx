import { useEffect, useMemo, useRef, useState } from "react";
import { apiFormRequest, apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

function formatSize(bytes = 0) {
  if (!bytes || Number.isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

export default function AttachmentsSection({
  title = "Attachments",
  fetchPath,
  uploadPath,
  deletePath,
  canManage = false,
  emptyMessage = "No attachments yet.",
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  refreshKey,
}) {
  const { token } = useAuth();
  const fileInputRef = useRef();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const allowedExtensions = useMemo(
    () => allowedTypes.map((type) => type.split("/").pop()).join(", "),
    [allowedTypes]
  );

  const loadAttachments = async () => {
    if (!fetchPath) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest(fetchPath, { token });
      setAttachments(data.attachments || []);
    } catch (err) {
      setError(err.message || "Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPath, token, refreshKey]);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalidFile = files.find((file) => !allowedTypes.includes(file.type));
    if (invalidFile) {
      setError(`Unsupported file type: ${invalidFile.name}. Allowed: ${allowedExtensions}`);
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("attachments[]", file));

      const data = await apiFormRequest(uploadPath, {
        method: "POST",
        token,
        body: formData,
      });

      setAttachments(data.attachments || []);
    } catch (err) {
      setError(err.message || "Failed to upload attachments.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!canManage) return;
    try {
      setError("");
      await apiRequest(`${deletePath}/${attachmentId}`, { method: "DELETE", token });
      loadAttachments();
    } catch (err) {
      setError(err.message || "Failed to delete attachment.");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">Upload client-facing documents, warranties, and more.</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload attachments"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-slate-600">Loading attachments...</p>
        ) : attachments.length === 0 ? (
          <p className="text-xs text-slate-600">{emptyMessage}</p>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
                  {attachment.filename?.split(".").pop()}
                </span>
                <div>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {attachment.filename}
                  </a>
                  <p className="text-[11px] text-slate-500">
                    {formatSize(attachment.byte_size)} • Uploaded {new Date(attachment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {canManage ? (
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              ) : (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-slate-700 hover:underline"
                >
                  Download
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
