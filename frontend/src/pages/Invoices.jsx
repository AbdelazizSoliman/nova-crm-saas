import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import AddPaymentModal from "../components/AddPaymentModal";

const statusBadges = {
  draft: "bg-slate-100 text-slate-700", // gray
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700",
};

const statusOptions = ["draft", "sent", "paid", "overdue", "cancelled"];
const currencyOptions = ["USD", "EUR", "SAR"];

const emptyItem = { description: "", quantity: 1, unit_price: 0, tax_rate: 0 };
const emptyPayment = { amount: "", paid_at: "", method: "", note: "" };

const createEmptyInvoice = () => ({
  client_id: "",
  invoice: {
    number: "",
    issue_date: "",
    due_date: "",
    currency: "USD",
    status: "draft",
    notes: "",
  },
  items: [{ ...emptyItem }],
  payments: [],
});

function formatMoney(amount, currency = "USD") {
  if (amount === undefined || amount === null || Number.isNaN(amount))
    return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount));
  } catch (e) {
    return amount;
  }
}

export default function Invoices() {
  const { token } = useAuth();
  const { invoiceId } = useParams();

  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createEmptyInvoice());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewError, setViewError] = useState("");
  const [viewLoading, setViewLoading] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const pages = useMemo(() => {
    const total = meta?.total_pages || 1;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [meta]);

  const fetchInvoices = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", page);
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const data = await apiRequest(`/invoices?${params.toString()}`, {
        token,
      });
      setInvoices(data.data || []);
      setMeta(data.meta || {});
    } catch (err) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const params = new URLSearchParams();
      params.set("page", 1);
      params.set("per_page", 100);
      const data = await apiRequest(`/clients?${params.toString()}`, { token });
      setClients(data.data || []);
    } catch (err) {
      console.error("Failed to load clients", err);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchInvoices(1);
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchInvoices(1);
  };

  const openCreateForm = () => {
    setFormData(createEmptyInvoice());
    setEditingId(null);
    setFormError("");
    setNotice("");
    setShowForm(true);
  };

  const mapInvoiceToForm = (invoice) => ({
    client_id: invoice.client?.id || "",
    invoice: {
      number: invoice.number || "",
      issue_date: invoice.issue_date || "",
      due_date: invoice.due_date || "",
      currency: invoice.currency || "USD",
      status: invoice.status || "draft",
      notes: invoice.notes || "",
    },
    items: (invoice.invoice_items || []).map((item) => ({
      id: item.id,
      description: item.description || "",
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      tax_rate: item.tax_rate || 0,
    })),
    payments: (invoice.payments || []).map((payment) => ({
      id: payment.id,
      amount: payment.amount || 0,
      paid_at: payment.paid_at ? payment.paid_at.split("Z")[0] : "",
      method: payment.method || "",
      note: payment.note || "",
    })),
  });

  const openEditForm = async (invoiceId) => {
    setFormLoading(true);
    setFormError("");
    setNotice("");
    setShowForm(true);
    setEditingId(invoiceId);
    setFormData(createEmptyInvoice());

    try {
      const data = await apiRequest(`/invoices/${invoiceId}`, { token });
      setFormData(mapInvoiceToForm(data));
    } catch (err) {
      setFormError(err.message || "Failed to load invoice");
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        [name]: value,
      },
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handlePaymentChange = (index, field, value) => {
    setFormData((prev) => {
      const payments = [...prev.payments];
      payments[index] = { ...payments[index], [field]: value };
      return { ...prev, payments };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const addPaymentRow = () => {
    setFormData((prev) => ({
      ...prev,
      payments: [...prev.payments, { ...emptyPayment }],
    }));
  };

  const removePaymentRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index),
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");

    const payload = {
      client_id: formData.client_id,
      invoice: {
        number: formData.invoice.number || undefined,
        issue_date: formData.invoice.issue_date,
        due_date: formData.invoice.due_date,
        currency: formData.invoice.currency,
        status: formData.invoice.status,
        notes: formData.invoice.notes,
      },
      items: (formData.items || []).map((item) => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        tax_rate: Number(item.tax_rate) || 0,
      })),
      payments: (formData.payments || []).map((payment) => ({
        amount: Number(payment.amount) || 0,
        paid_at: payment.paid_at,
        method: payment.method,
        note: payment.note,
      })),
    };

    try {
      if (editingId) {
        await apiRequest(`/invoices/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });
        setNotice("Invoice updated successfully.");
      } else {
        await apiRequest(`/invoices`, {
          method: "POST",
          token,
          body: payload,
        });
        setNotice("Invoice created successfully.");
      }

      setShowForm(false);
      setFormData(createEmptyInvoice());
      setEditingId(null);
      fetchInvoices(meta.current_page || 1);
    } catch (err) {
      setFormError(err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Delete invoice "${invoice.number}"?`)) return;
    try {
      setError("");
      await apiRequest(`/invoices/${invoice.id}`, { method: "DELETE", token });
      setNotice("Invoice deleted.");
      fetchInvoices(meta.current_page || 1);
    } catch (err) {
      setError(err.message || "Failed to delete invoice");
    }
  };

  const fetchInvoiceDetail = async (invoiceId) => {
    try {
      setViewLoading(true);
      setViewError("");
      const data = await apiRequest(`/invoices/${invoiceId}`, { token });
      setViewInvoice(data);
    } catch (err) {
      setViewError(err.message || "Failed to load invoice");
    } finally {
      setViewLoading(false);
    }
  };

  const openView = (invoiceId) => {
    setShowPaymentModal(false);
    setViewInvoice({ id: invoiceId });
    setViewLoading(true);
    fetchInvoiceDetail(invoiceId);
  };

  useEffect(() => {
    if (invoiceId && token) {
      openView(invoiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, token]);

  const handleDuplicate = async (invoiceId) => {
    try {
      setError("");
      await apiRequest(`/invoices/${invoiceId}/duplicate`, {
        method: "POST",
        token,
      });
      setNotice("Invoice duplicated successfully.");
      fetchInvoices(meta.current_page || 1);
    } catch (err) {
      setError(err.message || "Failed to duplicate invoice");
    }
  };

  const handlePaymentCreated = async (invoiceId) => {
    await fetchInvoiceDetail(invoiceId);
    fetchInvoices(meta.current_page || 1);
    setNotice("Payment added successfully.");
  };

  const handleDeletePayment = async (paymentId, invoiceId) => {
    if (!window.confirm("Delete this payment?")) return;

    try {
      setViewError("");
      await apiRequest(`/payments/${paymentId}`, { method: "DELETE", token });
      await fetchInvoiceDetail(invoiceId);
      fetchInvoices(meta.current_page || 1);
      setNotice("Payment deleted.");
    } catch (err) {
      setViewError(err.message || "Failed to delete payment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">
            Manage your invoices, status, and payments.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New invoice
        </button>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Invoice number or client name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              From
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              To
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filter
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Issue date</th>
              <th className="px-4 py-2">Due date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {invoice.number}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {invoice.client?.name}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {invoice.issue_date}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {invoice.due_date}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        statusBadges[invoice.status] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {formatMoney(invoice.total, invoice.currency || "USD")}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => openView(invoice.id)}
                      className="text-xs font-medium text-slate-700 hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditForm(invoice.id)}
                      className="text-xs font-medium text-slate-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(invoice.id)}
                      className="text-xs font-medium text-slate-700 hover:underline"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(invoice)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages.length > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <p>
            Page {meta.current_page} of {meta.total_pages} —{" "}
            {meta.total_records} invoices
          </p>
          <div className="flex gap-1">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => fetchInvoices(page)}
                className={`min-w-[32px] rounded-md px-2 py-1 ${
                  page === meta.current_page
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit invoice" : "New invoice"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            {formLoading && (
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Loading invoice...
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Client
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  >
                    <option value="" disabled>
                      {clientsLoading
                        ? "Loading clients..."
                        : "Select a client"}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Invoice number
                  </label>
                  <input
                    name="number"
                    value={formData.invoice.number}
                    onChange={handleFormChange}
                    placeholder="Auto if empty"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Issue date
                  </label>
                  <input
                    type="date"
                    name="issue_date"
                    value={formData.invoice.issue_date}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Due date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.invoice.due_date}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.invoice.currency}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  >
                    {currencyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.invoice.status}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={1}
                    value={formData.invoice.notes}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-medium text-slate-700 hover:underline"
                  >
                    + Add item
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-12"
                    >
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Description
                        </label>
                        <input
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Unit price
                        </label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "unit_price",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Tax %
                        </label>
                        <input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) =>
                            handleItemChange(index, "tax_rate", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div className="flex items-center md:col-span-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Payments
                  </h3>
                  <button
                    type="button"
                    onClick={addPaymentRow}
                    className="text-xs font-medium text-slate-700 hover:underline"
                  >
                    + Add payment
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.payments || []).map((payment, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-12"
                    >
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) =>
                            handlePaymentChange(index, "amount", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Paid at
                        </label>
                        <input
                          type="datetime-local"
                          value={payment.paid_at}
                          onChange={(e) =>
                            handlePaymentChange(
                              index,
                              "paid_at",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Method
                        </label>
                        <input
                          value={payment.method}
                          onChange={(e) =>
                            handlePaymentChange(index, "method", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Note
                        </label>
                        <input
                          value={payment.note}
                          onChange={(e) =>
                            handlePaymentChange(index, "note", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                        />
                      </div>
                      <div className="flex items-center md:col-span-1 md:justify-end">
                        <button
                          type="button"
                          onClick={() => removePaymentRow(index)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  disabled={saving || formLoading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewInvoice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Invoice {viewInvoice.number}
                </h2>
                <p className="text-sm text-slate-500">
                  {viewInvoice.client?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDuplicate(viewInvoice.id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => openEditForm(viewInvoice.id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setViewInvoice(null);
                  }}
                  className="text-sm text-slate-500 hover:text-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {viewError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {viewError}
              </div>
            )}

            {viewLoading ? (
              <p className="text-sm text-slate-600">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs uppercase text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {viewInvoice.status}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs uppercase text-slate-500">Dates</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Issue: {viewInvoice.issue_date} <br /> Due:{" "}
                      {viewInvoice.due_date}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs uppercase text-slate-500">Total</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMoney(viewInvoice.total, viewInvoice.currency)}
                    </p>
                    <p className="text-xs text-slate-600">
                      Subtotal{" "}
                      {formatMoney(viewInvoice.subtotal, viewInvoice.currency)}{" "}
                      · Tax{" "}
                      {formatMoney(viewInvoice.tax_total, viewInvoice.currency)}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2">Qty</th>
                        <th className="px-4 py-2">Unit price</th>
                        <th className="px-4 py-2">Tax %</th>
                        <th className="px-4 py-2 text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewInvoice.invoice_items || []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 text-slate-700">
                            {item.description}
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            {formatMoney(item.unit_price, viewInvoice.currency)}
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            {item.tax_rate}%
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900">
                            {formatMoney(item.line_total, viewInvoice.currency)}
                          </td>
                        </tr>
                      ))}
                      {(viewInvoice.invoice_items || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 text-center text-slate-500"
                          >
                            No items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Payments
                      </h3>
                      <p className="text-xs text-slate-600">
                        {(viewInvoice.payments || []).length} payment(s)recorded
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      + Add Payment
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(viewInvoice.payments || []).map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatMoney(
                                payment.amount,
                                viewInvoice.currency
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {payment.paid_at}
                            </p>
                            <p className="text-xs text-slate-600">
                              Method: {payment.method}
                            </p>
                            {payment.note && (
                              <p className="text-xs text-slate-500">
                                {payment.note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleDeletePayment(payment.id, viewInvoice.id)
                            }
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {(viewInvoice.payments || []).length === 0 && (
                      <p className="text-xs text-slate-600">
                        No payments recorded.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showPaymentModal && viewInvoice?.id && (
        <AddPaymentModal
          invoiceId={viewInvoice.id}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => handlePaymentCreated(viewInvoice.id)}
        />
      )}
    </div>
  );
}
