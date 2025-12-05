import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

export default function Register() {
  const { token, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    account_name: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirmation: "",
    default_currency: "USD",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const data = await apiRequest("/auth/register", { method: "POST", body: form });
      login(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200 grid grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden lg:block bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl font-bold">N</div>
          <h1 className="mt-6 text-3xl font-semibold">Nova CRM SaaS</h1>
          <p className="mt-2 text-slate-200">
            Launch your CRM, invoicing, and billing SaaS faster with multi-tenant accounts, subscriptions, notifications, and activity logs ready to go.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-100">
            <p>✓ Branded auth pages with demo mode login</p>
            <p>✓ Secure multi-tenant account model</p>
            <p>✓ Billing, invoices, and product catalog</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">N</div>
              <span>Nova CRM SaaS</span>
            </div>
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Already have an account?
            </Link>
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-slate-900">Create your workspace</h2>
          <p className="mt-1 text-sm text-slate-600">Set up your company profile to start managing clients and invoices.</p>

          {error && <div className="mt-4"><Alert type="danger" message={error} /></div>}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Company / Account name</label>
              <input
                required
                name="account_name"
                value={form.account_name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                placeholder="Acme Inc"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">First name</label>
                <input
                  required
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Last name</label>
                <input
                  required
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  required
                  minLength={6}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Confirm password</label>
                <input
                  required
                  minLength={6}
                  type="password"
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Default currency</label>
              <select
                name="default_currency"
                value={form.default_currency}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Creating workspace..." : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
