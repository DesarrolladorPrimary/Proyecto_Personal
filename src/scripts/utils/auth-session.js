const TOKEN_KEY = "Token";
const AUTH_NOTICE_KEY = "AuthRedirectNotice";
const DEFAULT_EXPIRED_MESSAGE = "Tu sesion expiro. Inicia sesion de nuevo.";
const DEFAULT_INVALID_MESSAGE = "Tu sesion ya no es valida. Inicia sesion de nuevo.";
const ROUTES = {
  login: "/public/auth/login.html",
  register: "/public/auth/regist.html",
  feed: "/public/feed/feed-main.html",
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

export const redirectTo = (target) => {
  window.location.href = target;
};

export const enforceSessionRoute = (pathname = window.location.pathname) => {
  const validSession = hasValidSession();
  const payload = parseTokenSafely();
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

  if (isFeedRoute(pathname) && !validSession) {
    redirectTo(ROUTES.login);
    return;
  }

  if (isAuthRoute(pathname) && validSession) {
    redirectTo(ROUTES.feed);
  }
};

export const logoutAndRedirect = (target = ROUTES.login, notice = null) => {
  clearToken();

  if (notice) {
    storeAuthNotice(notice);
  }

  redirectTo(target);
};
