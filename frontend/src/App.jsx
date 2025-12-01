import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
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
        <Route path="invoices" element={<Invoices />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
