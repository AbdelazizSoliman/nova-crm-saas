import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

const recordTypeOptions = [
  "",
  "Invoice",
  "Client",
  "Product",
  "Account",
  "Subscription",
  "User",
];

const defaultFilters = {
  q: "",
  record_type: "",
  from: "",
  to: "",
  user_id: "",
};

export default function ActivityLog() {
  const { token } = useAuth();

  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(defaultFilters);

  const fetchLogs = async (page = 1, appliedFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", page);

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const data = await apiRequest(`/activity_logs?${params.toString()}`, { token });
      setLogs(data.data || []);
      setMeta(data.meta || { current_page: 1, total_pages: 1, total_records: 0 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchLogs(1, filters);
  };

  const detailSummary = (metadata = {}) => {
    const parts = [];

    if (metadata.number) parts.push(`No. ${metadata.number}`);
    if (metadata.name) parts.push(metadata.name);
    if (metadata.recipient) parts.push(`To ${metadata.recipient}`);
    if (metadata.client_name) parts.push(metadata.client_name);
    if (metadata.sku) parts.push(`SKU ${metadata.sku}`);
    if (metadata.plan_name) parts.push(metadata.plan_name);
    if (metadata.email) parts.push(metadata.email);

    if (parts.length === 0 && metadata.plan_code) parts.push(metadata.plan_code);
    if (parts.length === 0 && metadata.invoice_number) parts.push(`Invoice ${metadata.invoice_number}`);

    return parts.join(" • ");
  };

  const formatUser = (user) => {
    if (!user) return "System";
    return user.name || user.email || "System";
  };

  const pages = [];
  for (let i = 1; i <= (meta.total_pages || 1); i += 1) {
    pages.push(i);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Activity Log</h1>
          <p className="text-sm text-slate-500">
            Review key actions across invoices, clients, products, settings, and more.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase text-slate-500">Search</label>
          <input
            type="text"
            name="q"
            placeholder="Search by action or details..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
            value={filters.q}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Record Type</label>
          <select
            name="record_type"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
            value={filters.record_type}
            onChange={handleFilterChange}
          >
            {recordTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option || "All"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">From</label>
          <input
            type="date"
            name="from"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
            value={filters.from}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">To</label>
          <input
            type="date"
            name="to"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
            value={filters.to}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">User ID (optional)</label>
          <input
            type="text"
            name="user_id"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
            value={filters.user_id}
            onChange={handleFilterChange}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              const resetFilters = { ...defaultFilters };
              setFilters(resetFilters);
              fetchLogs(1, resetFilters);
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply filters
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">{formatUser(log.user)}</td>
                  <td className="px-4 py-2 text-slate-700">{log.action}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {log.record_type ? `${log.record_type}${log.record_id ? ` #${log.record_id}` : ""}` : "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{detailSummary(log.metadata)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Page {meta.current_page || 1} of {meta.total_pages || 1} — {meta.total_records || 0} events
          </div>
          <div className="flex flex-wrap gap-2">
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => fetchLogs(p)}
                className={`rounded-lg px-3 py-1 text-sm font-medium ${
                  p === currentPage
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
