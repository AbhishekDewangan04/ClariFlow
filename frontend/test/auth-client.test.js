import test from 'node:test'
import assert from 'node:assert/strict'
import { getMe, login, logout, request, updateProfile } from '../src/api/auth.js'
import { ApiError } from '../src/lib/apiClient.js'

// Mock global fetch for testing isolated API client behavior
const originalFetch = global.fetch

test('Frontend Auth API Client Unit Tests', async (t) => {
  t.afterEach(() => {
    global.fetch = originalFetch
  })

  await t.test('getMe() returns { user: null } on 401 unauthenticated response without throwing', async () => {
    global.fetch = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Authentication required.' }),
    })

    const result = await getMe()
    assert.deepEqual(result, { user: null }, 'Expected getMe to resolve with { user: null } on 401')
  })

  await t.test('getMe() returns user object on 200 authenticated response', async () => {
    const mockUser = { id: 1, email: 'admin@clariflow.local', role: 'admin', name: 'Admin' }
    global.fetch = async () => ({
      status: 200,
      ok: true,
      json: async () => ({ user: mockUser }),
    })

    const result = await getMe()
    assert.deepEqual(result, { user: mockUser })
  })

  await t.test('getMe() preserves error handling and throws ApiError on genuine network failure', async () => {
    global.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }

    await assert.rejects(
      async () => getMe(),
      (err) => {
        assert.ok(err instanceof ApiError, 'Expected err to be ApiError')
        assert.equal(err.kind, 'network')
        assert.equal(err.status, null)
        return true
      }
    )
  })

  await t.test('getMe() preserves error handling and throws ApiError on 500 server error', async () => {
    global.fetch = async () => ({
      status: 500,
      ok: false,
      json: async () => ({ error: 'Internal Server Error' }),
    })

    await assert.rejects(
      async () => getMe(),
      (err) => {
        assert.ok(err instanceof ApiError, 'Expected err to be ApiError')
        assert.equal(err.kind, 'server')
        assert.equal(err.status, 500)
        return true
      }
    )
  })

  await t.test('request() shared helper throws ApiError on 401 when allow401 is false/omitted', async () => {
    global.fetch = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Authentication required.' }),
    })

    await assert.rejects(
      async () => request('/api/admin/users'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 401)
        assert.equal(err.kind, 'unauthorized')
        return true
      }
    )
  })

  await t.test('request() shared helper returns { user: null } on 401 when allow401: true', async () => {
    global.fetch = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Authentication required.' }),
    })

    const result = await request('/api/auth/me', { allow401: true })
    assert.deepEqual(result, { user: null })
  })

  await t.test('login() returns user payload on valid credentials (200)', async () => {
    const mockUser = { id: 1, email: 'admin@clariflow.local', role: 'admin', name: 'Admin' }
    let interceptedUrl = null
    let interceptedOptions = null

    global.fetch = async (url, options) => {
      interceptedUrl = url
      interceptedOptions = options
      return {
        status: 200,
        ok: true,
        json: async () => ({ user: mockUser }),
      }
    }

    const result = await login('admin@clariflow.local', 'ValidPassword123')
    assert.deepEqual(result, { user: mockUser })
    assert.ok(interceptedUrl.includes('/api/auth/login'))
    assert.equal(interceptedOptions.method, 'POST')
    assert.equal(interceptedOptions.credentials, 'include')
    const parsedBody = JSON.parse(interceptedOptions.body)
    assert.equal(parsedBody.email, 'admin@clariflow.local')
    assert.equal(parsedBody.password, 'ValidPassword123')
  })

  await t.test('login() throws ApiError with kind "unauthorized" on 401 wrong password', async () => {
    global.fetch = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Invalid email or password.' }),
    })

    await assert.rejects(
      async () => login('admin@clariflow.local', 'WrongPassword!'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 401)
        assert.equal(err.kind, 'unauthorized')
        assert.equal(err.message, 'Invalid email or password.')
        return true
      }
    )
  })

  await t.test('login() throws ApiError with kind "unauthorized" on 401 unknown user', async () => {
    global.fetch = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Invalid email or password.' }),
    })

    await assert.rejects(
      async () => login('nonexistent@clariflow.local', 'AnyPassword123'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 401)
        assert.equal(err.kind, 'unauthorized')
        assert.equal(err.message, 'Invalid email or password.')
        return true
      }
    )
  })

  await t.test('login() throws ApiError with kind "rate_limited" on 429 response', async () => {
    global.fetch = async () => ({
      status: 429,
      ok: false,
      json: async () => ({ error: 'Too many login attempts. Please wait 15 minutes before trying again.' }),
    })

    await assert.rejects(
      async () => login('user@test.com', 'Pass123'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 429)
        assert.equal(err.kind, 'rate_limited')
        return true
      }
    )
  })

  await t.test('login() throws ApiError with kind "network" on network failure', async () => {
    global.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }

    await assert.rejects(
      async () => login('user@test.com', 'Pass123'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.kind, 'network')
        return true
      }
    )
  })

  await t.test('logout() calls POST /api/auth/logout with credentials', async () => {
    let interceptedUrl = null
    let interceptedOptions = null

    global.fetch = async (url, options) => {
      interceptedUrl = url
      interceptedOptions = options
      return {
        status: 200,
        ok: true,
        json: async () => ({ message: 'Logged out.' }),
      }
    }

    const result = await logout()
    assert.deepEqual(result, { message: 'Logged out.' })
    assert.ok(interceptedUrl.includes('/api/auth/logout'))
    assert.equal(interceptedOptions.method, 'POST')
    assert.equal(interceptedOptions.credentials, 'include')
  })

  await t.test('updateProfile() calls PATCH /api/auth/profile with updated display name', async () => {
    let interceptedUrl = null
    let interceptedOptions = null

    global.fetch = async (url, options) => {
      interceptedUrl = url
      interceptedOptions = options
      return {
        status: 200,
        ok: true,
        json: async () => ({ user: { id: 1, email: 'admin@clariflow.local', name: 'New Name', role: 'admin' } }),
      }
    }

    const result = await updateProfile({ name: 'New Name' })
    assert.equal(result.user.name, 'New Name')
    assert.ok(interceptedUrl.includes('/api/auth/profile'))
    assert.equal(interceptedOptions.method, 'PATCH')
    assert.equal(interceptedOptions.credentials, 'include')
    const body = JSON.parse(interceptedOptions.body)
    assert.equal(body.name, 'New Name')
  })

  await t.test('updateProfile() propagates ApiError on 400 Bad Request', async () => {
    global.fetch = async () => ({
      status: 400,
      ok: false,
      json: async () => ({ error: 'Name cannot exceed 100 characters.' }),
    })

    await assert.rejects(
      async () => updateProfile({ name: 'A'.repeat(101) }),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 400)
        assert.equal(err.message, 'Name cannot exceed 100 characters.')
        return true
      }
    )
  })
})
