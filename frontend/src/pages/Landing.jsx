import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  "Clients & Invoices",
  "Products & Payments",
  "Subscriptions & Multi-tenant",
  "Multi-currency & Tax",
  "Activity Log & Notifications",
];

export default function Landing() {
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-bold text-white shadow-lg">
            N
          </div>
          <span>Nova CRM SaaS</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/login"
            className="rounded-lg border border-white/20 px-4 py-2 font-medium hover:border-white hover:bg-white hover:text-slate-900"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900 shadow hover:bg-slate-100"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-6">
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
            Launch-ready CRM & Billing SaaS
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Simple CRM, Invoicing & Billing for modern teams.
          </h1>
          <p className="text-lg text-slate-200">
            Nova CRM SaaS ships with dashboards, billing, activity logs, and notifications so your customers can onboard in minutes.
          </p>

          <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-100">
            {features.map((feature) => (
              <span
                key={feature}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"
              >
                <span className="text-sky-300">•</span>
                {feature}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg hover:bg-slate-100"
            >
              Start free trial
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:border-white"
            >
              Existing account? Login
            </Link>
          </div>
        </div>

        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800/70 p-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent" />
          <div className="relative space-y-4">
            <p className="text-sm uppercase tracking-wide text-slate-300">
              Quick highlights
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-slate-100">
              <div className="rounded-xl bg-white/5 p-3 shadow-inner">
                <p className="text-xs text-slate-300">Multi-tenant</p>
                <p className="text-lg">Accounts & Teams</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 shadow-inner">
                <p className="text-xs text-slate-300">Billing</p>
                <p className="text-lg">Subscriptions</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 shadow-inner">
                <p className="text-xs text-slate-300">Finance</p>
                <p className="text-lg">Invoices & PDF</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 shadow-inner">
                <p className="text-xs text-slate-300">Insight</p>
                <p className="text-lg">Activity log</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Deliver a polished first impression with branded auth pages, demo mode protections, and consistent UI components.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
