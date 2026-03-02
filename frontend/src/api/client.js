const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path) {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string'
      ? data
      : data.error || data.message || `Request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export function getApiBase() {
  return API_BASE;
}

export function fileUrl(id) {
  return `${API_BASE}/file/${encodeURIComponent(id)}`;
}

export function absoluteFileUrl(id) {
  return new URL(fileUrl(id), window.location.origin).toString();
}