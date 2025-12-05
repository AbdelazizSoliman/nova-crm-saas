import { useEffect, useMemo, useState } from "react";
import { apiFormRequest, apiRequest, apiRequestBlob } from "../api/client";
import { useAuth } from "../context/AuthContext";

const templateOptions = [
  {
    key: "template_a",
    title: "Template A",
    subtitle: "Simple and minimal for fast exports.",
    accent: "from-blue-500 to-blue-600",
  },
  {
    key: "template_b",
    title: "Template B",
    subtitle: "Modern layout with accent sidebar.",
    accent: "from-indigo-500 to-indigo-700",
  },
  {
    key: "template_c",
    title: "Template C",
    subtitle: "Classic, table-focused appearance.",
    accent: "from-slate-500 to-slate-700",
  },
];

const defaultBranding = {
  invoice_template: "template_a",
  brand_color: "#2563eb",
  footer_text: "",
  additional_note: "",
  logo_url: "",
};

export default function InvoiceBranding() {
  const { token } = useAuth();
  const [branding, setBranding] = useState(defaultBranding);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadBranding = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest(`/settings/branding`, { token });
        setBranding({ ...defaultBranding, ...(data || {}) });
      } catch (err) {
        setError(err.message || "Failed to load branding settings.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadBranding();
    }
  }, [token]);

  const handleTemplateSelect = (key) => {
    setBranding((prev) => ({ ...prev, invoice_template: key }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBranding((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

    if (!allowedTypes.includes(file.type)) {
      setError("Logo must be a PNG, JPG, or SVG file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be smaller than 2MB.");
      return;
    }

    setError("");
    setRemoveLogo(false);
    setLogoFile(file);
    setBranding((prev) => ({ ...prev, logo_url: URL.createObjectURL(file) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("invoice_template", branding.invoice_template || "template_a");
      formData.append("brand_color", branding.brand_color || "");
      formData.append("footer_text", branding.footer_text || "");
      formData.append("additional_note", branding.additional_note || "");
      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (removeLogo) {
        formData.append("remove_logo", "true");
      }

      const response = await apiFormRequest(`/settings/branding`, {
        method: "PATCH",
        token,
        body: formData,
      });

      setBranding({ ...defaultBranding, ...(response || {}) });
      setLogoFile(null);
      setRemoveLogo(false);
      setSuccess("Branding saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  };

  const previewInvoicePayload = useMemo(
    () => ({
      invoice: {
        number: "INV-2025-0001",
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        currency: "USD",
        status: "draft",
        notes: "Thank you for choosing NovaCRM!",
        tax_rate: 10,
        tax_name: "VAT",
      },
      client: {
        name: "Acme Industries",
        contact_name: "Jane Doe",
        email: "client@example.com",
      },
      items: [
        { description: "Design consultation", quantity: 4, unit_price: 120 },
        { description: "Development sprint", quantity: 20, unit_price: 80 },
        { description: "Support retainer", quantity: 1, unit_price: 300 },
      ],
      payments: [],
    }),
    []
  );

  const handlePreview = async () => {
    setPreviewing(true);
    setError("");

    try {
      const blob = await apiRequestBlob(`/invoices/preview_pdf`, {
        method: "POST",
        token,
        body: {
          ...previewInvoicePayload,
          template: branding.invoice_template,
          branding: {
            brand_color: branding.brand_color,
            footer_text: branding.footer_text,
            additional_note: branding.additional_note,
            template: branding.invoice_template,
          },
        },
      });

      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, "_blank", "noopener");
    } catch (err) {
      setError(err.message || "Failed to generate preview.");
    } finally {
      setPreviewing(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading invoice branding...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Branding & Invoice Templates</h1>
        <p className="text-sm text-slate-600">
          Upload your company logo, pick a brand color, and align invoice PDFs with your identity.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <SettingsCard title="Template selector" description="Pick one of the ready-made PDF layouts.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {templateOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleTemplateSelect(option.key)}
                  className={`group relative rounded-xl border p-4 text-left transition ${branding.invoice_template === option.key
                    ? "border-slate-900 ring-2 ring-slate-900"
                    : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className={`h-20 rounded-lg bg-gradient-to-r ${option.accent} opacity-80`}></div>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                    <p className="text-xs text-slate-600">{option.subtitle}</p>
                    {branding.invoice_template === option.key && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2 py-1 text-[11px] font-medium text-white">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard
            title="Branding options"
            description="Upload your logo, set the accent color, and personalize footer content."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Brand color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="brand_color"
                      value={branding.brand_color || "#2563eb"}
                      onChange={handleInputChange}
                      className="h-11 w-16 rounded border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      name="brand_color"
                      value={branding.brand_color || ""}
                      onChange={handleInputChange}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                      placeholder="#2563eb"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Accent color is used for headers, totals, and highlights.</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Company logo</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoChange}
                      className="text-sm text-slate-600"
                    />
                    {branding.logo_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setBranding((prev) => ({ ...prev, logo_url: "" }));
                          setLogoFile(null);
                          setRemoveLogo(true);
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                  {branding.logo_url && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                      <img
                        src={branding.logo_url}
                        alt="Logo preview"
                        className="h-20 w-auto rounded border border-slate-200 bg-white object-contain"
                      />
                      <div className="text-xs text-slate-600">Used in all templates</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Footer text</label>
                  <textarea
                    name="footer_text"
                    value={branding.footer_text || ""}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                    placeholder="Extra legal or contact information."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Additional note</label>
                  <textarea
                    name="additional_note"
                    value={branding.additional_note || ""}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
                    placeholder="Default note added beneath invoice notes."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save branding"}
                </button>
              </div>
            </div>
          </SettingsCard>
        </div>

        <div className="space-y-4">
          <SettingsCard
            title="Live PDF preview"
            description="Generate a temporary PDF without saving changes."
          >
            <ul className="mb-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>Uses the template and branding selections above.</li>
              <li>Sample items ensure page breaks and totals look correct.</li>
              <li>No data is stored when creating a preview.</li>
            </ul>
            <button
              onClick={handlePreview}
              disabled={previewing}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {previewing ? "Generating..." : "Preview PDF"}
            </button>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-600">{description}</p>}
          </div>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}
