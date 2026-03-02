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

if (token && !hasValidSession) {
  localStorage.removeItem("Token");
}

if (route.includes("/feed/") && !hasValidSession) {
  window.location.href = "/public/auth/login.html";
}

if ((route.includes("login") || route.includes("regist")) && hasValidSession) {
  window.location.href = "/public/feed/feed-main.html";
}
