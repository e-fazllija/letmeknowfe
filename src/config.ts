// --- Feature flags & experimental toggles (safe defaults) ---
export const FEATURE_SETTINGS = String(import.meta.env.VITE_FEATURE_SETTINGS ?? "true").toLowerCase() === "true";
export const CSRF_PROTECTION = String(import.meta.env.VITE_CSRF_PROTECTION ?? "false").toLowerCase() === "true";
export const EXPERIMENTAL_POLICY_FIELDS = String(import.meta.env.VITE_EXPERIMENTAL_POLICY_FIELDS ?? "false").toLowerCase() === "true";
export const EXPERIMENTAL_TEMPLATES_UPSERT = String(import.meta.env.VITE_EXPERIMENTAL_TEMPLATES_UPSERT ?? "true").toLowerCase() === "true";
export const FEATURE_STORAGE = String(import.meta.env.VITE_FEATURE_STORAGE ?? "false").toLowerCase() === "true";
export const USE_PUBLIC_LOOKUPS = String(import.meta.env.VITE_USE_PUBLIC_LOOKUPS ?? "true").toLowerCase() === "true";
export const FEATURE_TEMPLATES = String(import.meta.env.VITE_FEATURE_TEMPLATES ?? "false").toLowerCase() === "true";
