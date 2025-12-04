import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import Payments from "./pages/Payments";
import Products from "./pages/Products";
import ActivityLog from "./pages/ActivityLog";
import Billing from "./pages/Billing";
import InvoiceBranding from "./pages/InvoiceBranding";
import Team from "./pages/Team";
import Notifications from "./pages/Notifications";
import ImportExport from "./pages/ImportExport";
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* كل الصفحات المحمية داخل AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="products" element={<Products />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:invoiceId" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="activity-log" element={<ActivityLog />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings/import-export" element={<ImportExport />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/team" element={<Team />} />
        <Route path="settings/invoice-template" element={<InvoiceBranding />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
