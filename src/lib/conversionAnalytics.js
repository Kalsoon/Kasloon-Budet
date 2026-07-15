const SAFE_PROPERTY_KEYS = new Set(["source", "feature", "action", "route", "milestone"]);

const sanitizeProperties = (properties = {}) => Object.fromEntries(
  Object.entries(properties)
    .filter(([key, value]) => SAFE_PROPERTY_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 80) : value]),
);

export function trackConversion(eventName, properties = {}) {
  if (typeof window === "undefined") return;
  const detail = { event: eventName, ...sanitizeProperties(properties) };
  window.dispatchEvent(new CustomEvent("kalsoon:conversion", { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: `kalsoon_${eventName}`, ...detail });
}
