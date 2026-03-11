export const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const DEFAULT_API_BASE_URLS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
];

const getWindowConfigUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.__APP_CONFIG__?.apiBaseUrl || "";
};

const getStoredApiBaseUrl = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return "";
  }

  return window.localStorage.getItem("apiBaseUrl") || "";
};

export const getApiBaseCandidates = () => {
  const candidates = [
    getWindowConfigUrl(),
    getStoredApiBaseUrl(),
    ...DEFAULT_API_BASE_URLS,
  ]
    .map(normalizeBaseUrl)
    .filter(Boolean);

  return [...new Set(candidates)];
};

export const getApiBaseUrl = () => getApiBaseCandidates()[0] || DEFAULT_API_BASE_URLS[0];

export const rememberApiBaseUrl = (baseUrl) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return;
  }

  window.localStorage.setItem("apiBaseUrl", normalized);
};

export const API_BASE_URL = getApiBaseUrl();

export const buildApiUrl = (path, params, baseUrl = getApiBaseUrl()) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export const buildUploadedAssetUrl = (relativePath) => {
  if (!relativePath) {
    return "";
  }

  const normalizedPath = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;

  return `${getApiBaseUrl()}${normalizedPath}`;
};
