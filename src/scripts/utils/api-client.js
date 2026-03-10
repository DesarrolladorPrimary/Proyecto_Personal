import { buildApiUrl } from "./api-config.js";
import {
  getAuthHeaders,
  getLoginRouteForPath,
  getToken,
  getUnauthorizedNotice,
  isTokenExpired,
  logoutAndRedirect,
  parseTokenSafely,
} from "./auth-session.js";

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { Mensaje: text };
  }
};

export const fetchJson = async (
  path,
  {
    method = "GET",
    params,
    body,
    headers = {},
    auth = false,
    redirectOnUnauthorized = true,
  } = {},
) => {
  if (auth) {
    const token = getToken();
    const tokenPayload = parseTokenSafely(token);

    if (token && tokenPayload && isTokenExpired(tokenPayload)) {
      const data = {
        Mensaje: "Tu sesion expiro. Inicia sesion de nuevo.",
        code: "TOKEN_EXPIRED",
      };

      if (redirectOnUnauthorized) {
        logoutAndRedirect(getLoginRouteForPath(), getUnauthorizedNotice(data));
      }

      return {
        ok: false,
        status: 401,
        data,
      };
    }
  }

  const requestHeaders = auth ? getAuthHeaders(headers) : { ...headers };

  const response = await fetch(buildApiUrl(path, params), {
    method,
    headers: requestHeaders,
    body,
  });

  const data = await parseJsonSafely(response);

  if (response.status === 401 && redirectOnUnauthorized) {
    logoutAndRedirect(getLoginRouteForPath(), getUnauthorizedNotice(data));
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
};
