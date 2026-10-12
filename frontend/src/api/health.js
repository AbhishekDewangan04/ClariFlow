import { env } from '../config/env.js'
import { ApiError, getJson } from '../lib/apiClient.js'

// Dev: "/_health" is rewritten to the backend's "GET /" by the Vite proxy.
const HEALTH_URL = env.apiBaseUrl ? `${env.apiBaseUrl}/` : '/_health'

function summarise(body) {
  if (typeof body === 'string') {
    if (/^\s*<(!doctype|html)/i.test(body)) {
      throw new ApiError('Received a web page instead of the API. Check the proxy / API URL.', { kind: 'invalid' })
    }
    return body.trim().slice(0, 140) || null
  }
  if (body && typeof body === 'object') {
    const text = body.message ?? body.status ?? JSON.stringify(body)
    return String(text).slice(0, 140)
  }
  return null
}

/** GET / — returns timing plus whatever the backend says (shape is not assumed). */
export async function getHealth({ signal } = {}) {
  const started = performance.now()
  const body = await getJson(HEALTH_URL, { signal })
  return {
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
    message: summarise(body),
    checkedAt: new Date().toISOString(),
  }
}
