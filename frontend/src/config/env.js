const read = (value) => (typeof value === 'string' ? value.trim() : '')

export const env = {
  // Empty in development: requests are relative and go through the Vite proxy.
  apiBaseUrl: read(import.meta.env?.VITE_API_BASE_URL).replace(/\/+$/, ''),
  // Display-only. The API does not report a currency.
  currency: read(import.meta.env?.VITE_CURRENCY).toUpperCase() || 'INR',
  requestTimeoutMs: 10_000,
  healthPollMs: 20_000,
}
