import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../utils/permissions";

const defaultAccountState = {
  company_name: "",
  company_address: "",
  company_phone: "",
  company_website: "",
  company_tax_id: "",
  company_logo_url: "",
};

const defaultInvoicingState = {
  default_currency: "USD",
  invoice_prefix: "INV",
  tax_name: "VAT",
  tax_rate: 0,
  tax_inclusive: false,
  default_payment_terms_days: 7,
};

const currencyOptions = ["USD", "EUR", "GBP", "SAR", "EGP"];

export default function Settings() {
  const { token, user } = useAuth();
  const permissions = usePermissions();
  const readOnlySettings = !permissions.canManageSettings;
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({
    profile: "",
    account: "",
    invoicing: "",
  });
  const [sectionSuccess, setSectionSuccess] = useState({
    profile: "",
    account: "",
    invoicing: "",
  });
  const [saving, setSaving] = useState({
    profile: false,
    account: false,
    invoicing: false,
  });

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    job_title: "",
    phone: "",
    avatar_url: "",
    locale: "en",
    timezone: "",
  });
  const [account, setAccount] = useState(defaultAccountState);
  const [invoicing, setInvoicing] = useState(defaultInvoicingState);

  const normalizeInvoicing = (serverInvoicing = {}) => ({
    ...defaultInvoicingState,
    ...serverInvoicing,
    tax_rate:
      serverInvoicing.tax_rate ??
      serverInvoicing.default_tax_rate ??
      defaultInvoicingState.tax_rate,
    tax_name: serverInvoicing.tax_name ?? defaultInvoicingState.tax_name,
    tax_inclusive:
      serverInvoicing.tax_inclusive ?? defaultInvoicingState.tax_inclusive,
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const data = await apiRequest(`/settings`, { token });
        setProfile((prev) => ({ ...prev, ...data.profile }));
        setAccount({ ...defaultAccountState, ...(data.account || {}) });
        setInvoicing(normalizeInvoicing(data.invoicing || {}));
      } catch (err) {
        setFetchError(err.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };

    if (token && permissions.canViewSettings) {
      loadSettings();
    }
  }, [token, permissions.canViewSettings]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccount((prev) => ({ ...prev, [name]: value }));
  };

  const handleInvoicingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInvoicing((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProfileSave = async () => {
    setSaving((prev) => ({ ...prev, profile: true }));
    setSectionErrors((prev) => ({ ...prev, profile: "" }));
    setSectionSuccess((prev) => ({ ...prev, profile: "" }));
    try {
      const response = await apiRequest(`/settings/profile`, {
        method: "PUT",
        token,
        body: { profile },
      });
      setProfile((prev) => ({ ...prev, ...response.profile }));
      setSectionSuccess((prev) => ({
        ...prev,
        profile: "Profile updated successfully.",
      }));
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        profile: err.message || "Failed to save profile.",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, profile: false }));
    }
  };

  const handleAccountSave = async () => {
    if (readOnlySettings) {
      setSectionErrors((prev) => ({
        ...prev,
        account: "You do not have permission to update company settings.",
      }));
      return;
    }

    setSaving((prev) => ({ ...prev, account: true }));
    setSectionErrors((prev) => ({ ...prev, account: "" }));
    setSectionSuccess((prev) => ({ ...prev, account: "" }));
    try {
      const response = await apiRequest(`/settings/account`, {
        method: "PUT",
        token,
        body: { account, invoicing: formattedInvoicingPayload() },
      });
      setAccount((prev) => ({ ...prev, ...(response.account || {}) }));
      setInvoicing((prev) => ({ ...prev, ...(response.invoicing || {}) }));
      setSectionSuccess((prev) => ({
        ...prev,
        account: "Company settings saved.",
      }));
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        account: err.message || "Failed to save company settings.",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, account: false }));
    }
  };

  const handleInvoicingSave = async () => {
    if (readOnlySettings) {
      setSectionErrors((prev) => ({
        ...prev,
        invoicing: "You do not have permission to update invoicing settings.",
      }));
      return;
    }

    setSaving((prev) => ({ ...prev, invoicing: true }));
    setSectionErrors((prev) => ({ ...prev, invoicing: "" }));
    setSectionSuccess((prev) => ({ ...prev, invoicing: "" }));
    try {
      const response = await apiRequest(`/settings/account`, {
        method: "PUT",
        token,
        body: { account, invoicing: formattedInvoicingPayload() },
      });
      setAccount((prev) => ({ ...prev, ...(response.account || {}) }));
      setInvoicing((prev) => ({ ...prev, ...(response.invoicing || {}) }));
      setSectionSuccess((prev) => ({
        ...prev,
        invoicing: "Invoicing preferences saved.",
      }));
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        invoicing: err.message || "Failed to save invoicing preferences.",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, invoicing: false }));
    }
  };

  const formattedInvoicingPayload = () => ({
    ...invoicing,
    tax_rate: invoicing.tax_rate === "" ? 0 : Number(invoicing.tax_rate),
    default_tax_rate:
      invoicing.tax_rate === "" ? 0 : Number(invoicing.tax_rate),
    default_payment_terms_days:
      invoicing.default_payment_terms_days === ""
        ? 0
        : Number(invoicing.default_payment_terms_days),
  });

  if (!permissions.canViewSettings) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You do not have permission to access settings.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">
          Manage your profile, company information, and invoicing preferences.
        </p>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SettingsCard
          title="Profile"
          description="Update your personal information."
          onSave={handleProfileSave}
          saving={saving.profile}
          error={sectionErrors.profile}
          success={sectionSuccess.profile}
          actionLabel="Save profile"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={profile.name || ""}
                onChange={handleProfileChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={profile.email || ""}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Job title
              </label>
              <input
                type="text"
                name="job_title"
                value={profile.job_title || ""}
                onChange={handleProfileChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                placeholder="Founder / CEO"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={profile.phone || ""}
                onChange={handleProfileChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                placeholder="+20123..."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Locale
                </label>
                <select
                  name="locale"
                  value={profile.locale || ""}
                  onChange={handleProfileChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  name="timezone"
                  value={profile.timezone || ""}
                  onChange={handleProfileChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="Africa/Cairo"
                />
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Company"
          description="Manage your company information."
          onSave={handleAccountSave}
          saving={saving.account}
          error={sectionErrors.account}
          success={sectionSuccess.account}
          actionLabel="Save company settings"
          disabled={readOnlySettings}
        >
          <fieldset disabled={readOnlySettings} className="space-y-4 disabled:opacity-90">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Company name
              </label>
              <input
                type="text"
                name="company_name"
                value={account.company_name || ""}
                onChange={handleAccountChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                placeholder="NovaSoft LLC"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Address
              </label>
              <textarea
                name="company_address"
                value={account.company_address || ""}
                onChange={handleAccountChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                rows={3}
                placeholder="Street 1, City, Country"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  name="company_phone"
                  value={account.company_phone || ""}
                  onChange={handleAccountChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="+20111..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  name="company_website"
                  value={account.company_website || ""}
                  onChange={handleAccountChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  name="company_tax_id"
                  value={account.company_tax_id || ""}
                  onChange={handleAccountChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="123-456-789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  name="company_logo_url"
                  value={account.company_logo_url || ""}
                  onChange={handleAccountChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="https://example.com/logo.png"
                />
                {account.company_logo_url && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1">
                    <img
                      src={account.company_logo_url}
                      alt="Company logo"
                      className="h-12 w-12 rounded object-contain border border-slate-200 bg-white"
                    />
                    <span className="text-xs text-slate-600">Preview</span>
                  </div>
                )}
              </div>
            </div>
          </fieldset>
        </SettingsCard>

        <SettingsCard
          title="Billing & Tax Settings"
          description="Configure your invoice defaults, currency, and tax preferences."
          onSave={handleInvoicingSave}
          saving={saving.invoicing}
          error={sectionErrors.invoicing}
          success={sectionSuccess.invoicing}
          actionLabel="Save billing settings"
          disabled={readOnlySettings}
        >
          <fieldset disabled={readOnlySettings} className="space-y-4 disabled:opacity-90">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default currency
                </label>
                <select
                  name="default_currency"
                  value={invoicing.default_currency || ""}
                  onChange={handleInvoicingChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                >
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  All products and invoices must use the account currency.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Invoice prefix
                </label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={invoicing.invoice_prefix || ""}
                  onChange={handleInvoicingChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="INV"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tax label
                </label>
                <input
                  type="text"
                  name="tax_name"
                  value={invoicing.tax_name || ""}
                  onChange={handleInvoicingChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  placeholder="VAT / Sales Tax"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default tax rate (%)
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  value={invoicing.tax_rate}
                  onChange={handleInvoicingChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  min="0"
                  max="50"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  name="tax_inclusive"
                  checked={!!invoicing.tax_inclusive}
                  onChange={handleInvoicingChange}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/40"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Prices include tax</p>
                  <p className="text-xs text-slate-600">
                    Future-friendly toggle; current totals remain tax-exclusive.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default payment terms (days)
                </label>
                <input
                  type="number"
                  name="default_payment_terms_days"
                  value={invoicing.default_payment_terms_days}
                  onChange={handleInvoicingChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                  min="1"
                  step="1"
                />
              </div>
            </div>
          </fieldset>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
  onSave,
  actionLabel,
  saving,
  error,
  success,
  disabled = false,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{description}</p>
        </div>
        <div className="space-y-3">{children}</div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || disabled}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : actionLabel}
        </button>
      </div>
    </div>
  );
}
