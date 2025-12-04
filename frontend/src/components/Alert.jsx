export default function Alert({ type = "info", message, children }) {
  if (!message && !children) return null;

  const styles = {
    info: "bg-blue-50 text-blue-800 border-blue-100",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100",
    warning: "bg-amber-50 text-amber-800 border-amber-100",
    danger: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles[type] || styles.info}`}>
      {message || children}
    </div>
  );
}
