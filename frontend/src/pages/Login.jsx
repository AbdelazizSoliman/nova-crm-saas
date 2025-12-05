import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/client";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || "demo@nova-crm.test";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "password";

export default function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const submitLogin = async (payload) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }

      login(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    submitLogin({ email, password });
  };

  const handleDemoLogin = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    submitLogin({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl border border-brand-100 grid grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden lg:block bg-gradient-to-br from-brand-900 to-brand-700 p-10 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl font-bold">N</div>
          <h1 className="mt-6 text-3xl font-semibold">Nova CRM SaaS</h1>
          <p className="mt-2 text-brand-100/90">
            Secure, multi-tenant CRM, invoicing, and billing experiences with protected demo mode for showcasing the product safely.
          </p>
          <div className="mt-8 space-y-3 text-sm text-brand-100">
            <p>✓ Clients, products, invoices, and PDF previews</p>
            <p>✓ Subscriptions, billing, and notifications</p>
            <p>✓ Activity log to keep teams aligned</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold text-brand-900 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">N</div>
              <span>Nova CRM SaaS</span>
            </div>
            <Link to="/register" className="text-sm font-medium text-brand-700 hover:text-brand-900">
              Create account
            </Link>
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-brand-900">Welcome back</h2>
          <p className="mt-1 text-sm text-brand-700">Sign in to access your dashboard and billing workspace.</p>

          {error && (
            <div className="mt-4">
              <Alert type="danger" message={error} />
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-brand-800">Email</label>
              <input
                required
                type="email"
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-brand-800">Password</label>
              <input
                required
                type="password"
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <button
              onClick={handleDemoLogin}
              type="button"
              className="btn-secondary w-full justify-center"
            >
              Login as Demo User
            </button>
            <p className="text-xs text-brand-700">
              Demo user is read-only for sensitive settings. Use it to explore the dashboard without risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
