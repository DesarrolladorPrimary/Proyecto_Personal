import { buildApiUrl } from "./api-config.js";
import { getAuthHeaders, logoutAndRedirect } from "./auth-session.js";

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
  const requestHeaders = auth ? getAuthHeaders(headers) : { ...headers };

  const response = await fetch(buildApiUrl(path, params), {
    method,
    headers: requestHeaders,
    body,
  });

  const data = await parseJsonSafely(response);

  if (response.status === 401 && redirectOnUnauthorized) {
    logoutAndRedirect();
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
};
