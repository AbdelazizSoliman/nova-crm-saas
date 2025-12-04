import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AttachmentsSection from "../components/AttachmentsSection";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../utils/permissions";

export default function ClientDetails() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { canManageClients } = usePermissions();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest(`/clients/${clientId}`, { token });
        setClient(data);
      } catch (err) {
        setError(err.message || "Failed to load client.");
      } finally {
        setLoading(false);
      }
    };

    if (clientId && token) {
      fetchClient();
    }
  }, [clientId, token]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading client...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-slate-700 hover:underline"
        >
          ← Back
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-600">Client record overview & files.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to clients
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoRow label="Contact" value={client.contact_name || "-"} />
            <InfoRow label="Email" value={client.email || "-"} />
            <InfoRow label="Phone" value={client.phone || "-"} />
            <InfoRow label="Country" value={client.country || "-"} />
            <InfoRow label="Address" value={client.address || "-"} full />
            <InfoRow label="Notes" value={client.notes || "No notes provided."} full />
          </div>
        </div>

        <AttachmentsSection
          title="Attachments"
          fetchPath={`/clients/${clientId}/attachments`}
          uploadPath={`/clients/${clientId}/attachments`}
          deletePath={`/clients/${clientId}/attachments`}
          canManage={canManageClients}
          emptyMessage="No attachments uploaded for this client."
          refreshKey={clientId}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
