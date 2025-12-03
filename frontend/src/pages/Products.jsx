import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";

const currencyOptions = ["USD", "EUR", "GBP", "SAR", "EGP"];
const productTypeOptions = [
  { label: "All types", value: "" },
  { label: "Product", value: "product" },
  { label: "Service", value: "service" },
];

const emptyProduct = {
  name: "",
  sku: "",
  description: "",
  unit_price: 0,
  default_tax_rate: "",
  currency: "USD",
  product_type: "service",
  category: "",
  is_active: true,
};

function formatMoney(amount, currency = "USD") {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "-";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount));
  } catch (e) {
    return amount;
  }
}

export default function Products() {
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const [billingSettings, setBillingSettings] = useState({
    currency: "USD",
    tax_rate: 0,
    tax_name: "VAT",
  });

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const pages = useMemo(() => {
    const total = meta?.total_pages || 1;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [meta]);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", page);
      if (search) params.set("q", search);
      if (typeFilter) params.set("product_type", typeFilter);
      if (onlyActive) params.set("only_active", "true");

      const data = await apiRequest(`/products?${params.toString()}`, { token });
      setProducts(data.data || []);
      setMeta(data.meta || {});
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingSettings = async () => {
    try {
      const data = await apiRequest(`/settings`, { token });
      const invoicing = data.invoicing || {};
      setBillingSettings({
        currency: invoicing.default_currency || "USD",
        tax_rate: invoicing.tax_rate ?? invoicing.default_tax_rate ?? 0,
        tax_name: invoicing.tax_name || "VAT",
      });
    } catch (err) {
      console.error("Failed to load billing settings", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchBillingSettings();
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const buildEmptyProduct = () => ({
    ...emptyProduct,
    currency: billingSettings.currency || emptyProduct.currency,
    default_tax_rate:
      billingSettings.tax_rate ?? emptyProduct.default_tax_rate,
  });

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormData(buildEmptyProduct());
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      unit_price: product.unit_price || 0,
      default_tax_rate: product.default_tax_rate ?? "",
      currency: product.currency || "USD",
      product_type: product.product_type || "",
      category: product.category || "",
      is_active: product.is_active !== false,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: "PUT",
          token,
          body: { product: formData },
        });
      } else {
        await apiRequest("/products", {
          method: "POST",
          token,
          body: { product: formData },
        });
      }

      setShowForm(false);
      setFormData(buildEmptyProduct());
      setEditingProduct(null);
      fetchProducts(meta.current_page || 1);
    } catch (err) {
      setFormError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    try {
      await apiRequest(`/products/${product.id}`, { method: "DELETE", token });
      fetchProducts(meta.current_page || 1);
    } catch (err) {
      setError(err.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">
            Manage your catalog of products and services.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New product
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          placeholder="Search by name, SKU or description"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {productTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          Only active
        </label>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Apply
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Unit price</th>
              <th className="px-4 py-2">Tax %</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-6 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-slate-500 line-clamp-2">{product.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{product.sku || "-"}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{product.product_type || "-"}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {formatMoney(product.unit_price, product.currency || "USD")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{product.default_tax_rate ?? "-"}</td>
                  <td className="px-4 py-3">
                    {product.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{product.category || "-"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                    <button
                      onClick={() => openEditForm(product)}
                      className="mr-3 text-slate-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => fetchProducts(page)}
            className={`rounded-lg px-3 py-1 text-sm ${
              page === meta.current_page
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingProduct ? "Edit product" : "New product"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                  <input
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
                  <input
                    name="sku"
                    value={formData.sku}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Unit price ({billingSettings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Amounts are shown in your account currency.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Default {billingSettings.tax_name || "tax"} rate %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="default_tax_rate"
                    value={formData.default_tax_rate}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  >
                    {currencyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Products must match your account currency ({billingSettings.currency}).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Product type</label>
                  <select
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  >
                    <option value="">Select type</option>
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <input
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="is_active"
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleFormChange}
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-700">
                    Active
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
