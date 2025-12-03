import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPaymentModal from "../components/AddPaymentModal";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

const methodOptions = [
  { value: "", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

const paymentMethodLabels = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  other: "Other",
};

function formatMoney(amount) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number(amount));
  } catch (e) {
    return amount;
  }
}

export default function Payments() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [method, setMethod] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);

  const pages = useMemo(() => {
    const total = meta?.total_pages || 1;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [meta]);

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", page);
      if (search) params.set("q", search);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      if (method) params.set("method", method);
      if (minAmount) params.set("min_amount", minAmount);
      if (maxAmount) params.set("max_amount", maxAmount);

      const data = await apiRequest(`/payments?${params.toString()}`, { token });
      setPayments(data.data || []);
      setMeta(data.meta || {});
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesForSelect = async () => {
    try {
      setInvoiceLoading(true);
      const params = new URLSearchParams();
      params.set("page", 1);
      params.set("per_page", 100);
      const data = await apiRequest(`/invoices?${params.toString()}`, { token });
      const options = (data.data || []).map((invoice) => ({
        id: invoice.id,
        label: `${invoice.number} — ${invoice.client?.name || "Unknown client"}`,
      }));
      setInvoiceOptions(options);
      if (options.length && !selectedInvoiceId) {
        setSelectedInvoiceId(options[0].id);
      }
    } catch (err) {
      console.error("Failed to load invoices", err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchPayments(1);
    fetchInvoicesForSelect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchPayments(1);
  };

  const handleClear = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setMethod("");
    setMinAmount("");
    setMaxAmount("");
    fetchPayments(1);
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm("Delete this payment?")) return;

    try {
      setError("");
      await apiRequest(`/payments/${paymentId}`, { method: "DELETE", token });
      setNotice("Payment deleted.");
      fetchPayments(meta.current_page || 1);
    } catch (err) {
      setError(err.message || "Failed to delete payment");
    }
  };

  const handleAddPaymentSuccess = () => {
    setNotice("Payment added successfully.");
    fetchPayments(meta.current_page || 1);
  };

  const formatPaidAt = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">
            Track received payments across all invoices.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          <select
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
          >
            {invoiceLoading && <option>Loading invoices...</option>}
            {!invoiceLoading && invoiceOptions.length === 0 && (
              <option value="">No invoices available</option>
            )}
            {!invoiceLoading &&
              invoiceOptions.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.label}
                </option>
              ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!selectedInvoiceId}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            + Add payment
          </button>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <input
              type="text"
              placeholder="Invoice #, client, or method"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
            >
              {methodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Min amount</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Max amount</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2 flex items-end gap-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Paid at</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{payment.invoice?.number}</td>
                  <td className="px-4 py-2 text-slate-700">{payment.invoice?.client?.name}</td>
                  <td className="px-4 py-2 text-slate-700">{formatMoney(payment.amount)}</td>
                  <td className="px-4 py-2 text-slate-700">{paymentMethodLabels[payment.method] || payment.method}</td>
                  <td className="px-4 py-2 text-slate-700">{formatPaidAt(payment.paid_at)}</td>
                  <td className="px-4 py-2 text-slate-700">{payment.note || "-"}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => navigate(`/invoices/${payment.invoice?.id}`)}
                      className="text-xs font-medium text-slate-700 hover:underline"
                    >
                      View invoice
                    </button>
                    <button
                      onClick={() => handleDelete(payment.id)}
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
            Page {meta.current_page} of {meta.total_pages} — {meta.total_records} payment(s)
          </p>
          <div className="flex gap-1">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => fetchPayments(page)}
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

      {showAddModal && selectedInvoiceId && (
        <AddPaymentModal
          invoiceId={selectedInvoiceId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddPaymentSuccess}
        />
      )}
    </div>
  );
}
