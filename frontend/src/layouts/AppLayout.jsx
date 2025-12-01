import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/clients", label: "Clients", icon: UserGroupIcon },
  { to: "/invoices", label: "Invoices", icon: DocumentTextIcon },
  { to: "/payments", label: "Payments", icon: BanknotesIcon },
  { to: "/settings", label: "Settings", icon: Cog6ToothIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800">
          <h1 className="text-lg font-semibold">NovaCRM</h1>
          <p className="text-xs text-slate-400">Simple SaaS CRM & Billing</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
                ].join(" ")
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div>
            <p className="font-medium text-slate-100 truncate max-w-[130px]">
              {user?.name}
            </p>
            <p className="text-slate-400">Owner</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h2 className="text-sm font-medium text-slate-700">Dashboard</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
