import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { token } = useAuth();
  const backHref = token ? "/dashboard" : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
        N
      </div>
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you are looking for may have moved or no longer exists. Use the button below to return to a safe place.
      </p>
      <Link
        to={backHref}
        className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800"
      >
        Back to {token ? "dashboard" : "home"}
      </Link>
    </div>
  );
}
