import { env } from '../config/env.js'

/**
 * kind: 'network' | 'timeout' | 'unreachable' | 'not_found' | 'client' | 'server' | 'invalid'
 */
export class ApiError extends Error {
  constructor(message, { kind, status = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

function parseBody(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function messageFrom(body) {
  if (body && typeof body === 'object') {
    const m = body.message ?? body.error
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  return null
}

function errorForStatus(status, body) {
  const serverMessage = messageFrom(body)
  if (status === 404) return new ApiError(serverMessage ?? 'Not found.', { kind: 'not_found', status })
  if (status === 503 && serverMessage && serverMessage.toLowerCase().includes('database')) {
    return new ApiError(serverMessage, { kind: 'database_unavailable', status })
  }
  if ([502, 503, 504].includes(status)) {
    return new ApiError(serverMessage ?? 'The API is unreachable. Is the backend running?', { kind: 'unreachable', status })
  }
  if (status >= 500) return new ApiError(serverMessage ?? 'The server hit an error.', { kind: 'server', status })
  return new ApiError(serverMessage ?? `Request failed (${status}).`, { kind: 'client', status })
}

/** GET a URL and return the parsed body (JSON object, or plain text). Throws ApiError. */
export async function getJson(url, { signal, timeoutMs = env.requestTimeoutMs } = {}) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
    const body = parseBody(await res.text())
    if (!res.ok) throw errorForStatus(res.status, body)
    return body
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (timedOut) throw new ApiError('The request timed out.', { kind: 'timeout' })
    if (signal?.aborted) throw err // cancelled by the caller; callers ignore this
    throw new ApiError('Could not reach the server. Check your connection.', { kind: 'network' })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
