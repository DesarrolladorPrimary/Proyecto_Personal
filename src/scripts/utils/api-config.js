export const API_BASE_URL = "http://localhost:8080";

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
