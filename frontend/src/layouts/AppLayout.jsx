import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../utils/permissions";
import { NotificationsProvider } from "../context/NotificationsContext";
import NotificationsDropdown from "../components/NotificationsDropdown";
import {
  HomeIcon,
  CubeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  ClockIcon,
  CreditCardIcon,
  SwatchIcon,
  UserPlusIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/clients", label: "Clients", icon: UserGroupIcon },
  { to: "/products", label: "Products", icon: CubeIcon },
  { to: "/invoices", label: "Invoices", icon: DocumentTextIcon },
  { to: "/payments", label: "Payments", icon: BanknotesIcon },
  { to: "/notifications", label: "Notifications", icon: BellIcon },
  { to: "/activity-log", label: "Activity Log", icon: ClockIcon },
  {
    to: "/billing",
    label: "Billing",
    icon: CreditCardIcon,
    shouldDisplay: (permissions) => permissions.canViewBilling,
  },
  {
    to: "/settings/team",
    label: "Team",
    icon: UserPlusIcon,
    shouldDisplay: (permissions) => permissions.canManageTeam,
  },
  {
    to: "/settings/branding",
    label: "Branding",
    icon: SwatchIcon,
    shouldDisplay: (permissions) => permissions.canViewSettings,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Cog6ToothIcon,
    shouldDisplay: (permissions) => permissions.canViewSettings,
  },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = usePermissions();

  const currentNavItem = navItems.find((item) => location.pathname.startsWith(item.to));
  const headerTitle = currentNavItem?.label || "Dashboard";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-brand-50 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-brand-900 text-brand-50 flex flex-col">
          <div className="px-6 py-4 border-b border-brand-800">
            <h1 className="text-lg font-semibold">NovaCRM</h1>
            <p className="text-xs text-brand-200">Simple SaaS CRM & Billing</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems
              .filter((item) => !item.shouldDisplay || item.shouldDisplay(permissions))
              .map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition",
                      isActive
                        ? "bg-brand-800 text-white"
                        : "text-brand-100 hover:bg-brand-800/70 hover:text-white",
                    ].join(" ")
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </NavLink>
              ))}
          </nav>

          <div className="px-4 py-3 border-t border-brand-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-medium text-brand-50 truncate max-w-[130px]">
                {user?.name}
              </p>
              <p className="text-brand-200 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-brand-100 hover:text-white"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <header className="h-16 bg-brand-50 border-b border-brand-100 flex items-center justify-between px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-700">Current Page</p>
              <h2 className="text-lg font-semibold text-brand-900">{headerTitle}</h2>
            </div>
            <div className="flex items-center gap-4">
              <NotificationsDropdown />
              <div className="text-right">
                <p className="text-sm font-semibold text-brand-900">{user?.name || user?.email}</p>
                <p className="text-xs text-brand-700 capitalize">{user?.role}</p>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
