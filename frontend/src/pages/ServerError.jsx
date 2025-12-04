import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ServerError() {
  const { token } = useAuth();
  const backHref = token ? "/dashboard" : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-6 text-center text-white">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold text-white">
        N
      </div>
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-200">
        We hit an unexpected error. Please try again or head back to continue browsing.
      </p>
      <Link
        to={backHref}
        className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100"
      >
        Back to {token ? "dashboard" : "home"}
      </Link>
    </div>
  );
}
