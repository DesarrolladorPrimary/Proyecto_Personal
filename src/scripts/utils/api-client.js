import {
  buildApiUrl,
  getApiBaseCandidates,
  rememberApiBaseUrl,
} from "./api-config.js";
import {
  getAuthHeaders,
  getLoginRouteForPath,
  getToken,
  getUnauthorizedNotice,
  isTokenExpired,
  logoutAndRedirect,
  parseTokenSafely,
} from "./auth-session.js";

/*
 * Wrapper compartido sobre fetch.
 * Maneja descubrimiento de base URL, expiración del token y parseo uniforme
 * de respuestas JSON o errores de texto plano.
 */
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
        Mensaje: "Tu sesión expiró. Inicia sesión de nuevo.",
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

  const candidateBaseUrls = getApiBaseCandidates();
  let networkError = null;

  for (let index = 0; index < candidateBaseUrls.length; index += 1) {
    const baseUrl = candidateBaseUrls[index];

    try {
      const response = await fetch(buildApiUrl(path, params, baseUrl), {
        method,
        headers: requestHeaders,
        body,
      });

      const data = await parseJsonSafely(response);
      const contentType = response.headers.get("content-type") || "";
      const htmlLike404 =
        path.startsWith("/api/") &&
        response.status === 404 &&
        contentType.includes("text/html");

      if (htmlLike404 && index < candidateBaseUrls.length - 1) {
        continue;
      }

      rememberApiBaseUrl(baseUrl);

      if (response.status === 401 && redirectOnUnauthorized) {
        logoutAndRedirect(getLoginRouteForPath(), getUnauthorizedNotice(data));
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      networkError = error;
    }
  }

  throw networkError || new Error("No fue posible conectar con la API");
};
