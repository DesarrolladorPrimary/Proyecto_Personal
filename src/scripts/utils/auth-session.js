const TOKEN_KEY = "Token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const parseTokenSafely = (token = getToken()) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = atob(padded);
    const payload = JSON.parse(decoded);

    return {
      ...payload,
      id: Number(payload.id ?? payload.Id ?? 0),
      role: payload.role ?? payload.Role ?? payload.Rol ?? "",
      exp: typeof payload.exp === "number" ? payload.exp : null,
    };
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (payload = parseTokenSafely()) => {
  if (!payload || !payload.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
};

export const hasValidSession = () => {
  const payload = parseTokenSafely();

  if (!payload) {
    return false;
  }

  return !isTokenExpired(payload);
};

export const getCurrentUserId = () => {
  const payload = parseTokenSafely();

  if (!payload || !Number.isFinite(payload.id) || payload.id <= 0) {
    return null;
  }

  return payload.id;
};

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getToken();

  if (!token) {
    return { ...extraHeaders };
  }

  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
};

export const logoutAndRedirect = (target = "/public/auth/login.html") => {
  clearToken();
  window.location.href = target;
};
