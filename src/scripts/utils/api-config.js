const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const resolveApiBaseUrl = () => {
  const configuredUrl =
    window.__APP_CONFIG__?.apiBaseUrl ||
    localStorage.getItem("apiBaseUrl") ||
    "http://localhost:8080";

  return normalizeBaseUrl(configuredUrl);
};

export const API_BASE_URL = resolveApiBaseUrl();

export const buildApiUrl = (path, params) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

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

  return `${API_BASE_URL}${normalizedPath}`;
};
