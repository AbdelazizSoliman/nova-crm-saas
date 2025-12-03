import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BanknotesIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  Bars3BottomLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { API_BASE_URL } from "../api/client";

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="text-sm text-slate-500 text-center py-8">{message}</p>;
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  const rangeLabel = useMemo(() => {
    if (range === "90d") return "last 90 days";
    return "last 30 days";
  }, [range]);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/dashboard/summary?range=${range}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );

        if (res.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load dashboard data");
        }

        setSummary(data);
        setError("");
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to load dashboard data");
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    return () => controller.abort();
  }, [token, logout, navigate, range]);

  const currencyCode = summary?.metrics?.currency || "USD";

  const formatMoney = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(Number(v || 0));

  const formatNumber = (v) => new Intl.NumberFormat("en-US").format(Number(v || 0));

  const charts = summary?.charts || {};
  const metrics = summary?.metrics || {};
  const topClients = summary?.top_clients || [];

  const kpiCards = [
    {
      icon: BanknotesIcon,
      label: `Revenue (${rangeLabel})`,
      value: formatMoney(metrics.total_revenue),
      helper: "Paid or partially paid invoices",
    },
    {
      icon: Bars3BottomLeftIcon,
      label: "Outstanding invoices",
      value: formatMoney(metrics.outstanding_invoices_amount),
      helper: "Sent or overdue",
    },
    {
      icon: ExclamationTriangleIcon,
      label: "Overdue invoices",
      value: formatNumber(metrics.overdue_invoices_count),
      helper: "Due date passed",
    },
    {
      icon: UserGroupIcon,
      label: "Clients",
      value: formatNumber(metrics.clients_count),
      helper: "Active customers",
    },
    {
      icon: DocumentChartBarIcon,
      label: `Invoices created (${rangeLabel})`,
      value: formatNumber(metrics.invoices_count),
      helper: "Issued in the selected window",
    },
    {
      icon: SparklesIcon,
      label: `Avg invoice (${rangeLabel})`,
      value: formatMoney(metrics.average_invoice_value),
      helper: "For paid or partially paid",
    },
    {
      icon: CheckCircleIcon,
      label: "Current plan",
      value: metrics.active_subscription_plan || "Free tier",
      helper: metrics.subscription_status
        ? `Subscription is ${metrics.subscription_status}`
        : "No active subscription",
    },
  ];

  const revenueData = (charts.revenue_timeseries || []).map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    total_revenue: Number(point.total_revenue || 0),
    paid_invoices_count: Number(point.paid_invoices_count || 0),
  }));

  const invoiceBreakdown = charts.invoice_status_breakdown || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            A real-time snapshot of revenue, invoices, and customer momentum.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            All monetary values shown in {currencyCode}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Time range</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Loading & error states */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-pulse"
            >
              <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
              <div className="h-6 w-32 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => {
              setError("");
              setSummary(null);
              setLoading(true);
              setRange(range);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* Charts & widgets */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Revenue chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm xl:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Revenue trend ({rangeLabel})
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Total invoice value for paid and partially paid invoices.
                  </p>
                </div>
              </div>
              <div className="h-72">
                {revenueData.length === 0 ? (
                  <EmptyState message="Not enough data yet to display this chart." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Area
                        type="monotone"
                        dataKey="total_revenue"
                        stroke="#2563eb"
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Invoice breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">
                  Invoices by status
                </h2>
                <span className="text-xs text-slate-500">All time</span>
              </div>
              <div className="h-72">
                {invoiceBreakdown.length === 0 ? (
                  <EmptyState message="No invoices to show yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={invoiceBreakdown} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="status" type="category" stroke="#6b7280" />
                      <Tooltip
                        formatter={(value, name) =>
                          name === "count" ? formatNumber(value) : formatMoney(value)
                        }
                        labelFormatter={(label) => `Status: ${label}`}
                      />
                      <Bar dataKey="count" name="Count" fill="#0ea5e9" radius={4} barSize={14} />
                      <Bar
                        dataKey="total_amount"
                        name="Total Amount"
                        fill="#22c55e"
                        radius={4}
                        barSize={14}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Bottom widgets */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Top clients */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Top clients</h2>
                  <p className="text-xs text-slate-500">Based on revenue in the selected range.</p>
                </div>
              </div>
              {topClients.length === 0 ? (
                <EmptyState message="No client revenue yet for this period." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-4">Client</th>
                        <th className="py-2 pr-4">Invoices</th>
                        <th className="py-2 pr-4">Total revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topClients.map((client) => (
                        <tr key={client.client_id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 font-medium text-slate-900">
                            {client.client_name}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {formatNumber(client.invoices_count)}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            {formatMoney(client.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick KPI recap */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Highlights</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-center justify-between">
                  <span>Revenue ({rangeLabel})</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(metrics.total_revenue)}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Outstanding invoices</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(metrics.outstanding_invoices_amount)}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Overdue invoices</span>
                  <span className="font-semibold text-slate-900">
                    {formatNumber(metrics.overdue_invoices_count)}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Invoices created ({rangeLabel})</span>
                  <span className="font-semibold text-slate-900">
                    {formatNumber(metrics.invoices_count)}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Average invoice value</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(metrics.average_invoice_value)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
