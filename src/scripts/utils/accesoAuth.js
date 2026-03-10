const AUTH_NOTICE_KEY = "AuthRedirectNotice";
const EXPIRED_NOTICE = {
  text: "Tu sesion expiro. Inicia sesion de nuevo.",
  background: "orange",
};
const INVALID_NOTICE = {
  text: "Tu sesion ya no es valida. Inicia sesion de nuevo.",
  background: "red",
};

const parseTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
};

const token = localStorage.getItem("Token");
const route = window.location.pathname;
const payload = parseTokenPayload(token);
const tokenExpired = payload?.exp ? payload.exp * 1000 <= Date.now() : false;
const hasValidSession = Boolean(token && payload && !tokenExpired);

const storeAuthNotice = (notice) => {
  sessionStorage.setItem(AUTH_NOTICE_KEY, JSON.stringify(notice));
};

if (token && !hasValidSession) {
  localStorage.removeItem("Token");
  storeAuthNotice(tokenExpired ? EXPIRED_NOTICE : INVALID_NOTICE);
}

if (route.includes("/feed/") && !hasValidSession) {
  window.location.href = "/public/auth/login.html";
}

if ((route.includes("login") || route.includes("regist")) && hasValidSession) {
  window.location.href = "/public/feed/feed-main.html";
}
