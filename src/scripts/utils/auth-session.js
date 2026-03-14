const TOKEN_KEY = "Token";
const AUTH_NOTICE_KEY = "AuthRedirectNotice";
const DEFAULT_EXPIRED_MESSAGE = "Tu sesión expiró. Inicia sesión de nuevo.";
const DEFAULT_INVALID_MESSAGE = "Tu sesión ya no es válida. Inicia sesión de nuevo.";
const ROUTES = {
  login: "/public/auth/login.html",
  register: "/public/auth/regist.html",
  feed: "/public/feed/feed-main.html",
  adminLogin: "/public/admin/login-admin.html",
  adminDashboard: "/public/admin/dashboard-admin.html",
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const normalizeAuthNotice = (notice) => {
  if (!notice) {
    return null;
  }

  if (typeof notice === "string") {
    return {
      text: notice,
      background: "orange",
    };
  }

  if (typeof notice.text !== "string" || !notice.text.trim()) {
    return null;
  }

  return {
    text: notice.text.trim(),
    background: notice.background || "orange",
  };
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

export const getCurrentUserRole = () => {
  const payload = parseTokenSafely();

  if (!payload || typeof payload.role !== "string") {
    return "";
  }

  return payload.role;
};

export const isAdminRole = (role = getCurrentUserRole()) =>
  role.trim().toLowerCase() === "admin";

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

export const getUnauthorizedNotice = (data = {}) => {
  if (data?.code === "TOKEN_EXPIRED") {
    return {
      text: data.Mensaje || DEFAULT_EXPIRED_MESSAGE,
      background: "orange",
    };
  }

  return {
    text: data?.Mensaje || DEFAULT_INVALID_MESSAGE,
    background: "red",
  };
};

export const storeAuthNotice = (notice) => {
  const normalized = normalizeAuthNotice(notice);

  if (!normalized) {
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_NOTICE_KEY, JSON.stringify(normalized));
};

export const consumeAuthNotice = () => {
  const rawNotice = sessionStorage.getItem(AUTH_NOTICE_KEY);

  if (!rawNotice) {
    return null;
  }

  sessionStorage.removeItem(AUTH_NOTICE_KEY);

  try {
    return normalizeAuthNotice(JSON.parse(rawNotice));
  } catch (error) {
    return null;
  }
};

export const isAuthRoute = (pathname = window.location.pathname) =>
  pathname === ROUTES.login || pathname === ROUTES.register;

export const isFeedRoute = (pathname = window.location.pathname) =>
  pathname.startsWith("/public/feed/");

export const isAdminRoute = (pathname = window.location.pathname) =>
  pathname.startsWith("/public/admin/");

export const isAdminLoginRoute = (pathname = window.location.pathname) =>
  pathname === ROUTES.adminLogin;

export const isProtectedAdminRoute = (pathname = window.location.pathname) =>
  isAdminRoute(pathname) && !isAdminLoginRoute(pathname);

export const getDefaultRouteForRole = (role = getCurrentUserRole()) =>
  isAdminRole(role) ? ROUTES.adminDashboard : ROUTES.feed;

export const getLoginRouteForPath = (pathname = window.location.pathname) =>
  isAdminRoute(pathname) ? ROUTES.adminLogin : ROUTES.login;

export const redirectTo = (target) => {
  window.location.href = target;
};

export const enforceSessionRoute = (pathname = window.location.pathname) => {
  const validSession = hasValidSession();
  const payload = parseTokenSafely();
  const role = payload?.role ?? "";
  const notice = payload && isTokenExpired(payload)
    ? {
        text: DEFAULT_EXPIRED_MESSAGE,
        background: "orange",
      }
    : {
        text: DEFAULT_INVALID_MESSAGE,
        background: "red",
      };

  if (getToken() && !validSession) {
    clearToken();
    storeAuthNotice(notice);
  }

  if (isAdminLoginRoute(pathname) && validSession) {
    redirectTo(getDefaultRouteForRole(role));
    return;
  }

  if (isProtectedAdminRoute(pathname) && !validSession) {
    redirectTo(ROUTES.adminLogin);
    return;
  }

  if (isProtectedAdminRoute(pathname) && !isAdminRole(role)) {
    storeAuthNotice({
      text: "No tienes permisos de administrador.",
      background: "red",
    });
    redirectTo(ROUTES.feed);
    return;
  }

  if (isFeedRoute(pathname) && !validSession) {
    redirectTo(ROUTES.login);
    return;
  }

  if (isAuthRoute(pathname) && validSession) {
    redirectTo(getDefaultRouteForRole(role));
  }
};

export const logoutAndRedirect = (target = getLoginRouteForPath(), notice = null) => {
  clearToken();

  if (notice) {
    storeAuthNotice(notice);
  }

  redirectTo(target);
};
