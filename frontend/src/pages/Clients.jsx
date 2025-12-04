import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import { usePermissions } from "../utils/permissions";

const emptyForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  notes: "",
};

export default function Clients() {
  const { token } = useAuth();
  const { canManageClients } = usePermissions();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClients = async (page = 1, q = search) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", page);
      if (q) params.set("q", q);

      const data = await apiRequest(`/clients?${params.toString()}`, {
        token,
      });

      setClients(data.data || []);
      setMeta(data.meta || {});
    } catch (err) {
      setError(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClients(1, search);
  };

  const openCreateForm = () => {
    if (!canManageClients) return;
    setEditingClient(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (client) => {
    if (!canManageClients) return;
    setEditingClient(client);
    setFormData({
      name: client.name || "",
      contact_name: client.contact_name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      country: client.country || "",
      notes: client.notes || "",
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!canManageClients) return;

    setSaving(true);
    setError("");

    try {
      if (editingClient) {
        await apiRequest(`/clients/${editingClient.id}`, {
          method: "PUT",
          token,
          body: { client: formData },
        });
      } else {
        await apiRequest("/clients", {
          method: "POST",
          token,
          body: { client: formData },
        });
      }

      setShowForm(false);
      setFormData(emptyForm);
      setEditingClient(null);
      fetchClients(meta.current_page || 1);
    } catch (err) {
      setError(err.message || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client) => {
    if (!canManageClients) return;
    if (!window.confirm(`Delete client "${client.name}"?`)) return;

    try {
      await apiRequest(`/clients/${client.id}`, {
        method: "DELETE",
        token,
      });
      fetchClients(meta.current_page || 1);
    } catch (err) {
      setError(err.message || "Failed to delete client");
    }
  };

  const pages = [];
  for (let i = 1; i <= (meta.total_pages || 1); i += 1) {
    pages.push(i);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">
            Manage your customers and their contact information.
          </p>
        </div>
        {canManageClients && (
          <button
            onClick={openCreateForm}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + New client
          </button>
        )}
      </div>

      {/* Search */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          placeholder="Search by name, contact or email..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Search
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2 hidden lg:table-cell">Country</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No clients found.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {client.name}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {client.contact_name}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{client.email}</td>
                  <td className="px-4 py-2 text-slate-700">{client.phone}</td>
                  <td className="px-4 py-2 text-slate-700 hidden lg:table-cell">
                    {client.country}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="text-xs font-medium text-slate-700 hover:underline"
                      >
                        View
                      </button>
                      {canManageClients ? (
                        <>
                          <button
                            onClick={() => openEditForm(client)}
                            className="text-xs font-medium text-slate-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">Read only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <p>
            Page {meta.current_page} of {meta.total_pages} —{" "}
            {meta.total_records} clients
          </p>
          <div className="flex gap-1">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => fetchClients(page)}
                className={[
                  "min-w-[32px] rounded-md px-2 py-1",
                  page === meta.current_page
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form drawer/modal (بسيط) */}
      {showForm && canManageClients && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingClient ? "Edit client" : "New client"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name *
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Contact name
                  </label>
                  <input
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Address
                </label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Country
                </label>
                <input
                  name="country"
                  value={formData.country}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
