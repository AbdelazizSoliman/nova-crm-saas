import { useAuth } from "../context/AuthContext";

export const API_BASE_URL = "http://localhost:3000/api";

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || data.errors?.join(", ") || "Request failed";
    throw new Error(message);
  }

  return data;
}

export async function apiFormRequest(path, { method = "POST", token, body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || data.errors?.join(", ") || "Request failed";
    throw new Error(message);
  }

  return data;
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
    throw new Error(text || "Request failed");
  }

  return res.blob();
}
