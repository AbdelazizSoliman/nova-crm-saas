import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { roleCapabilities, usePermissions } from "../utils/permissions";

const roleOptions = ["owner", "admin", "manager", "viewer"];

export default function Team() {
  const { token, user } = useAuth();
  const permissions = usePermissions();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "manager",
  });
  const [inviting, setInviting] = useState(false);

  const [savingMemberId, setSavingMemberId] = useState(null);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [members]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest("/team", { token });
      setMembers(data || []);
    } catch (err) {
      setError(err.message || "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !permissions.canManageTeam) return;
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, permissions.canManageTeam]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/team/invite", {
        method: "POST",
        token,
        body: inviteForm,
      });
      setInviteForm({ name: "", email: "", role: inviteForm.role });
      setNotice("Invitation created successfully.");
      loadTeam();
    } catch (err) {
      setError(err.message || "Failed to invite team member.");
    } finally {
      setInviting(false);
    }
  };

  const canChangeRole = (member) => {
    if (!permissions.canManageTeam) return false;
    if (member.id === user?.id) return false;
    if (member.role === "owner" && permissions.role !== "owner") return false;
    return true;
  };

  const handleRoleChange = async (member, newRole) => {
    if (!canChangeRole(member)) return;
    setSavingMemberId(member.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/team/${member.id}`, {
        method: "PATCH",
        token,
        body: { role: newRole },
      });
      loadTeam();
    } catch (err) {
      setError(err.message || "Failed to update role.");
    } finally {
      setSavingMemberId(null);
    }
  };

  const toggleStatus = async (member) => {
    if (!permissions.canManageTeam) return;

    const deactivating = member.status === "active";
    if (deactivating && !window.confirm(`Deactivate ${member.name}?`)) return;

    setSavingMemberId(member.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/team/${member.id}`, {
        method: "PATCH",
        token,
        body: { deactivated: deactivating },
      });
      loadTeam();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setSavingMemberId(null);
    }
  };

  if (!permissions.canManageTeam) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You do not have permission to access the team area.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-600">
            Manage users and roles for this account.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Team members</h2>
              <p className="text-xs text-slate-500">Owners and admins can update roles and deactivate users.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 hidden md:table-cell">Joined</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Loading team...
                      </td>
                    </tr>
                  ) : sortedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No team members yet.
                      </td>
                    </tr>
                  ) : (
                    sortedMembers.map((member) => {
                      const memberRole = member.role || "viewer";
                      const roleDisabled = !canChangeRole(member);
                      const showOwnerOption = permissions.role === "owner";

                      return (
                        <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{member.name}</td>
                          <td className="px-4 py-2 text-slate-700">{member.email}</td>
                          <td className="px-4 py-2 text-slate-700">
                            <select
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                              value={memberRole}
                              disabled={roleDisabled || savingMemberId === member.id}
                              onChange={(e) => handleRoleChange(member, e.target.value)}
                            >
                              {roleOptions
                                .filter((role) => showOwnerOption || role !== "owner")
                                .map((role) => (
                                  <option key={role} value={role}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                                member.status === "active"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-700",
                              ].join(" ")}
                            >
                              {member.status === "active" ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-700 hidden md:table-cell">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => toggleStatus(member)}
                              disabled={savingMemberId === member.id}
                              className="text-xs font-medium text-slate-700 hover:underline disabled:opacity-50"
                            >
                              {member.status === "active" ? "Deactivate" : "Reactivate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Invite a teammate</h3>
          <p className="mt-1 text-xs text-slate-500">
            The new member will receive a placeholder password; emailing the invitation can be configured later.
          </p>

          <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Full name</label>
              <input
                type="text"
                required
                value={inviteForm.name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              >
                {roleOptions
                  .filter((role) => permissions.role === "owner" || role !== "owner")
                  .map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {inviting ? "Sending..." : "Send invite"}
            </button>
          </form>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Role capabilities</p>
            <ul className="mt-2 space-y-1">
              {roleOptions.map((role) => {
                const permissionsByRole = roleCapabilities[role];
                return (
                  <li key={role} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-slate-400" />
                    <span className="text-slate-700">
                      <span className="font-semibold capitalize">{role}</span>: {permissionsByRole.canManageBilling ? "Full access" : permissionsByRole.readOnly ? "Read only" : "Standard access"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
