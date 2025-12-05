import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../utils/permissions";

export default function Billing() {
  const { token } = useAuth();
  const permissions = usePermissions();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectingPlanId, setSelectingPlanId] = useState(null);

  const loadBillingData = async () => {
    setLoading(true);
    setError("");
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        apiRequest("/plans", { token }),
        apiRequest("/subscription", { token }),
      ]);

      setPlans(plansResponse || []);
      setCurrentSubscription(subscriptionResponse?.subscription || null);
      setCurrentPlan(subscriptionResponse?.plan || null);
    } catch (err) {
      setError(err.message || "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && permissions.canViewBilling) {
      loadBillingData();
    }
  }, [token, permissions.canViewBilling]);

  const formatPrice = (plan) => {
    const price = Number(plan.price || 0).toFixed(2);
    return `${price} ${plan.currency}/${plan.interval}`;
  };

  const handleToggleCancellation = async () => {
    if (!currentSubscription || !permissions.canManageBilling) return;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest("/subscription", {
        method: "PATCH",
        token,
        body: {
          cancel_at_period_end: !currentSubscription.cancel_at_period_end,
        },
      });

      setCurrentSubscription(updated.subscription);
      setCurrentPlan(updated.plan);
      setSuccess(
        updated.subscription.cancel_at_period_end
          ? "Subscription will cancel at the end of the current period."
          : "Cancellation has been removed."
      );
    } catch (err) {
      setError(err.message || "Failed to update subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChoosePlan = async (planId) => {
    if (!permissions.canManageBilling) return;

    setSelectingPlanId(planId);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest("/subscription", {
        method: "POST",
        token,
        body: { plan_id: planId },
      });

      setCurrentSubscription(response.subscription);
      setCurrentPlan(response.plan);
      setSuccess("Subscription updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update subscription.");
    } finally {
      setSelectingPlanId(null);
    }
  };

  const isCurrentPlan = useMemo(() => {
    if (!currentPlan) return () => false;
    return (planId) => currentPlan.id === planId;
  }, [currentPlan]);

  if (!permissions.canViewBilling) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You do not have permission to access billing.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading billing information...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600">
          Manage your subscription, billing plan, and renewal preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Current Subscription</p>
                {currentPlan ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p className="text-lg font-semibold text-slate-900">
                      {currentPlan.name} ({currentPlan.code})
                    </p>
                    <p className="text-slate-700">{formatPrice(currentPlan)}</p>
                    <p className="text-slate-600">Status: {currentSubscription?.status}</p>
                    {currentSubscription?.current_period_start && (
                      <p className="text-slate-600">
                        Current period: {new Date(currentSubscription.current_period_start).toLocaleDateString()} - {" "}
                        {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                    {currentSubscription?.cancel_at_period_end && (
                      <p className="text-xs text-amber-600">
                        This subscription is set to cancel at the end of the current period.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    No active subscription. Choose a plan below to get started.
                  </p>
                )}
              </div>

              {currentSubscription && (
                <button
                  onClick={handleToggleCancellation}
                  disabled={actionLoading || !permissions.canManageBilling}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Updating..." : currentSubscription.cancel_at_period_end ? "Undo cancellation" : "Cancel at end of period"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Available Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const current = isCurrentPlan(plan.id);
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-5 shadow-sm transition ${
                    current ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                      <p className="text-sm text-slate-600">{plan.description || ""}</p>
                    </div>
                    {current && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-2xl font-bold text-slate-900">{formatPrice(plan)}</p>

                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {plan.max_users && <li>Up to {plan.max_users} users</li>}
                    {plan.max_clients && <li>Up to {plan.max_clients} clients</li>}
                    {plan.max_invoices_per_month && (
                      <li>Up to {plan.max_invoices_per_month} invoices/month</li>
                    )}
                    {plan.max_storage_mb && <li>{plan.max_storage_mb} MB storage</li>}
                  </ul>

                  <button
                    onClick={() => handleChoosePlan(plan.id)}
                    disabled={current || selectingPlanId === plan.id || !permissions.canManageBilling}
                    className={`mt-5 w-full rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
                      current
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-brand-700 text-white hover:bg-brand-600"
                    } ${selectingPlanId === plan.id ? "opacity-70" : ""}`}
                  >
                    {current ? "Current plan" : selectingPlanId === plan.id ? "Updating..." : "Choose this plan"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
