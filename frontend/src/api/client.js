import { useAuth } from "../context/AuthContext";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildHeaders(token, hasBody = true) {
  const headers = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || data.errors?.join(", ") || "Request failed";
    throw new ApiError(message, res.status);
  }
  return data;
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token, true),
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleJsonResponse(res);
}

export async function apiFormRequest(path, { method = "POST", token, body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token, false),
    body,
  });

  return handleJsonResponse(res);
}

export async function apiRequestBlob(path, { method = "GET", token, body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestBody =
    body && !(body instanceof FormData) ? JSON.stringify(body) : body;

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: requestBody,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || "Request failed", res.status);
  }

  return res.blob();
}
