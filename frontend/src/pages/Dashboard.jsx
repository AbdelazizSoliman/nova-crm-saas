import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BanknotesIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:3000/api/dashboard/summary", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

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
  }, [token, logout, navigate, reloadCount]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <button
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => {
            setError("");
            setReloadCount((count) => count + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return <p>Loading...</p>;
  }

  const { totals, top_clients = [], monthly_series = [] } = summary;

  const formatMoney = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(v || 0));

  const chartData = monthly_series.map((m) => ({
    month: m.month,
    total: Number(m.total || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {user?.name}
        </h1>
        <p className="text-sm text-slate-500">
          Here&apos;s an overview of your business performance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DocumentTextIcon}
          label="Total Invoices"
          value={totals.invoices_count}
          helper="All time"
        />
        <StatCard
          icon={UserGroupIcon}
          label="Clients"
          value={totals.clients_count}
          helper="Active customers"
        />
        <StatCard
          icon={BanknotesIcon}
          label="This Month Revenue"
          value={formatMoney(totals.month_total)}
          helper="Invoiced this month"
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Overdue Invoices"
          value={formatMoney(totals.overdue_total)}
          helper="Total overdue amount"
        />
      </div>

      {/* Grid: chart + top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Revenue (last 6 months)
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value) => formatMoney(value)}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Top Clients
          </h2>
          {top_clients.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {top_clients.map((client) => (
                <li
                  key={client.id}
                  className="py-2 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{client.name}</p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatMoney(client.total_spent)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
