import { useAuth } from "../context/AuthContext";

export const roleCapabilities = {
  owner: {
    canManageClients: true,
    canManageInvoices: true,
    canManageProducts: true,
    canManagePayments: true,
    canManageSettings: true,
    canViewSettings: true,
    canManageBilling: true,
    canViewBilling: true,
    canManageTeam: true,
    readOnly: false,
  },
  admin: {
    canManageClients: true,
    canManageInvoices: true,
    canManageProducts: true,
    canManagePayments: true,
    canManageSettings: true,
    canViewSettings: true,
    canManageBilling: false,
    canViewBilling: true,
    canManageTeam: true,
    readOnly: false,
  },
  manager: {
    canManageClients: true,
    canManageInvoices: true,
    canManageProducts: true,
    canManagePayments: true,
    canManageSettings: false,
    canViewSettings: true,
    canManageBilling: false,
    canViewBilling: false,
    canManageTeam: false,
    readOnly: false,
  },
  viewer: {
    canManageClients: false,
    canManageInvoices: false,
    canManageProducts: false,
    canManagePayments: false,
    canManageSettings: false,
    canViewSettings: false,
    canManageBilling: false,
    canViewBilling: false,
    canManageTeam: false,
    readOnly: true,
  },
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || "viewer";
  const capabilities = roleCapabilities[role] || roleCapabilities.viewer;

  return { role, ...capabilities };
}
