export const formatCurrency = (val, market) => {
  if (val == null || Number.isNaN(val)) return "—";
  const opts = { maximumFractionDigits: 0 };
  if (market === "INDIA")
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", ...opts }).format(val);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", ...opts }).format(val);
};

export const formatCurrencyDecimal = (val, market) => {
  if (val == null || Number.isNaN(val)) return "—";
  if (market === "INDIA")
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const fmtRelative = (iso) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
};

export const tvSymbolFor = (symbol) => {
  if (!symbol) return "";
  if (symbol.endsWith(".NS")) return "BSE:" + symbol.replace(".NS", "");
  if (symbol.endsWith(".BO")) return "BSE:" + symbol.replace(".BO", "");
  return symbol;
};
