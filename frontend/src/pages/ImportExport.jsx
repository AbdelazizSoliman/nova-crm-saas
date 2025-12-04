import { useMemo, useState } from "react";
import { apiFormRequest, apiRequestBlob } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../utils/permissions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const clientHeaders = ["name", "email", "phone", "address", "company"];
const productHeaders = ["name", "sku", "price", "tax_rate", "description"];

const exampleClients = [
  {
    name: "Acme Corp",
    email: "billing@acme.test",
    phone: "+1 202-555-0101",
    address: "221B Baker Street",
    company: "Acme Holdings",
  },
  {
    name: "Moonlight LLC",
    email: "ops@moonlight.test",
    phone: "+44 20 7946 0958",
    address: "10 Downing St, London",
    company: "Moonlight LLC",
  },
];

const exampleProducts = [
  {
    name: "Consulting Hours",
    sku: "CONS-001",
    price: "120",
    tax_rate: "5",
    description: "Hourly consulting services",
  },
  {
    name: "CRM License",
    sku: "CRM-STARTER",
    price: "49",
    tax_rate: "",
    description: "Starter subscription seat",
  },
];

function buildCsv(headers, rows) {
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] ?? "";
      const sanitized = value.toString().replaceAll("\"", "\"\"");
      return `"${sanitized}"`;
    });
    lines.push(values.join(","));
  });

  return lines.join("\n");
}

function ExampleCsvButton({ headers, rows, filename }) {
  const handleDownload = () => {
    const blob = new Blob([buildCsv(headers, rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
    >
      Download example CSV
    </button>
  );
}

function ImportCard({
  title,
  description,
  headers,
  exampleRows,
  onFileChange,
  onUpload,
  loading,
  error,
  result,
  disabled,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <ExampleCsvButton
          headers={headers}
          rows={exampleRows}
          filename={`${title.toLowerCase().replaceAll(" ", "_")}_example.csv`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Allowed columns:</span>
        {headers.map((header) => (
          <span
            key={header}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-700"
          >
            {header}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <input
          type="file"
          accept=".csv"
          onChange={onFileChange}
          disabled={loading || disabled}
          className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <div className="text-xs text-slate-500">Max size 5MB. UTF-8 CSV only.</div>
        <button
          onClick={onUpload}
          disabled={loading || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
              Uploading...
            </>
          ) : (
            "Upload CSV"
          )}
        </button>

        {disabled && (
          <p className="text-xs text-amber-600">
            You do not have permission to import this data.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <p className="font-semibold">Import summary</p>
            <p className="mt-1">Imported: {result.success}</p>
            <p>Failed: {result.failed}</p>
            {result.errors?.length ? (
              <ul className="mt-2 space-y-1 text-amber-800">
                {result.errors.map((err) => (
                  <li key={`${err.row}-${err.message}`} className="text-xs">
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-emerald-700">All rows imported successfully.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportExport() {
  const { token } = useAuth();
  const permissions = usePermissions();

  const [clientFile, setClientFile] = useState(null);
  const [productFile, setProductFile] = useState(null);

  const [clientResult, setClientResult] = useState(null);
  const [productResult, setProductResult] = useState(null);

  const [clientError, setClientError] = useState("");
  const [productError, setProductError] = useState("");

  const [uploading, setUploading] = useState({ clients: false, products: false });
  const [exporting, setExporting] = useState({ clients: false, products: false, invoices: false, zip: false });
  const [exportMessage, setExportMessage] = useState("");

  const canAccessPage = permissions.canViewSettings;
  const canImportClients = permissions.canManageClients;
  const canImportProducts = permissions.canManageProducts;
  const canExportInvoices = permissions.canManageInvoices;

  const validateFile = (file) => {
    if (!file) return "Please select a CSV file.";
    if (!file.name.toLowerCase().endsWith(".csv")) return "Only CSV files are allowed.";
    if (file.size > MAX_FILE_SIZE) return "File is too large. Maximum size is 5MB.";
    return "";
  };

  const handleClientUpload = async () => {
    setClientResult(null);
    setClientError("");

    const validation = validateFile(clientFile);
    if (validation) {
      setClientError(validation);
      return;
    }

    setUploading((prev) => ({ ...prev, clients: true }));
    try {
      const formData = new FormData();
      formData.append("file", clientFile);
      const response = await apiFormRequest("/import/clients", { method: "POST", token, body: formData });
      setClientResult(response);
    } catch (err) {
      setClientError(err.message || "Failed to import clients.");
    } finally {
      setUploading((prev) => ({ ...prev, clients: false }));
    }
  };

  const handleProductUpload = async () => {
    setProductResult(null);
    setProductError("");

    const validation = validateFile(productFile);
    if (validation) {
      setProductError(validation);
      return;
    }

    setUploading((prev) => ({ ...prev, products: true }));
    try {
      const formData = new FormData();
      formData.append("file", productFile);
      const response = await apiFormRequest("/import/products", { method: "POST", token, body: formData });
      setProductResult(response);
    } catch (err) {
      setProductError(err.message || "Failed to import products.");
    } finally {
      setUploading((prev) => ({ ...prev, products: false }));
    }
  };

  const triggerDownload = async (path, filename, key) => {
    setExportMessage("");
    setExporting((prev) => ({ ...prev, [key]: true }));
    try {
      const blob = await apiRequestBlob(path, { token });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setExportMessage(`${filename} is downloading...`);
    } catch (err) {
      setExportMessage(err.message || "Download failed.");
    } finally {
      setExporting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const exportButtons = useMemo(
    () => [
      {
        label: "Export Clients (.csv)",
        path: "/export/clients",
        filename: "clients_export.csv",
        key: "clients",
        disabled: !canImportClients,
      },
      {
        label: "Export Products (.csv)",
        path: "/export/products",
        filename: "products_export.csv",
        key: "products",
        disabled: !canImportProducts,
      },
      {
        label: "Export Invoices (.csv)",
        path: "/export/invoices",
        filename: "invoices_export.csv",
        key: "invoices",
        disabled: !canExportInvoices,
      },
    ],
    [canExportInvoices, canImportClients, canImportProducts]
  );

  if (!canAccessPage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You do not have permission to access import/export settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Import & Export</h1>
        <p className="text-sm text-slate-600">
          Upload CSV files to bulk create or update records, or export your data and invoices for backups.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportCard
          title="Import Clients"
          description="Upload a CSV file to create or update clients using their email address as the unique key."
          headers={clientHeaders}
          exampleRows={exampleClients}
          onFileChange={(e) => setClientFile(e.target.files?.[0])}
          onUpload={handleClientUpload}
          loading={uploading.clients}
          error={clientError}
          result={clientResult}
          disabled={!canImportClients}
        />

        <ImportCard
          title="Import Products"
          description="Upload a CSV file to create or update products. Products are matched by SKU."
          headers={productHeaders}
          exampleRows={exampleProducts}
          onFileChange={(e) => setProductFile(e.target.files?.[0])}
          onUpload={handleProductUpload}
          loading={uploading.products}
          error={productError}
          result={productResult}
          disabled={!canImportProducts}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Export Data</h3>
            <p className="text-sm text-slate-600">Download your data as CSV files or export invoice PDFs as a ZIP archive.</p>
          </div>
          {exportMessage && <p className="text-sm text-slate-600">{exportMessage}</p>}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {exportButtons.map((button) => (
            <button
              key={button.key}
              onClick={() => triggerDownload(button.path, button.filename, button.key)}
              disabled={exporting[button.key] || button.disabled}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              {exporting[button.key] ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              ) : null}
              {button.label}
            </button>
          ))}

          <button
            onClick={() => triggerDownload(
              "/export/invoices_zip",
              `invoices_export_${new Date().toISOString().slice(0, 10)}.zip`,
              "zip"
            )}
            disabled={exporting.zip || !canExportInvoices}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            {exporting.zip ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            ) : null}
            Download All Invoice PDFs (ZIP)
          </button>
        </div>

        {!canExportInvoices && (
          <p className="mt-3 text-xs text-amber-600">You do not have permission to export invoices.</p>
        )}
      </div>
    </div>
  );
}
