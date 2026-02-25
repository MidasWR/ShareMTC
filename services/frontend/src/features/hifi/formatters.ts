export function formatUSD(value: number, language: "ru" | "en" = "en") {
  return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDateTime(value: string, language: "ru" | "en" = "en") {
  return new Date(value).toLocaleString(language === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function flagFromCountry(code: string) {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
