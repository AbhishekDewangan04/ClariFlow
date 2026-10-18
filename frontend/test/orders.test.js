import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeOrder } from '../src/api/orders.js'
import { toneOf } from '../src/lib/tones.js'
import { formatCurrency, formatDateTime, formatRelative, initials } from '../src/lib/format.js'
import { ApiError } from '../src/lib/apiClient.js'

test('Frontend Order Data Normalization', async (t) => {
  await t.test('correctly normalizes valid order payload', () => {
    const raw = {
      orderNumber: 'ORD-TEST-200',
      customerName: 'Alex Rivera',
      status: 'DELIVERED',
      totalAmount: 200,
      createdAt: '2026-10-09T07:48:38.570Z',
      updatedAt: '2026-10-11T07:48:38.570Z',
    }
    const order = normalizeOrder(raw)
    assert.equal(order.orderNumber, 'ORD-TEST-200')
    assert.equal(order.customerName, 'Alex Rivera')
    assert.equal(order.status, 'DELIVERED')
    assert.equal(order.totalAmount, 200)
    assert.ok(order.createdAt)
    assert.ok(order.updatedAt)
  })

  await t.test('handles nested order object wrapper', () => {
    const wrapped = {
      order: {
        orderNumber: 'ORD-NESTED',
        customerName: 'Sam Lee',
        status: 'PROCESSING',
        totalAmount: 45.5,
      },
    }
    const order = normalizeOrder(wrapped)
    assert.equal(order.orderNumber, 'ORD-NESTED')
    assert.equal(order.customerName, 'Sam Lee')
  })

  await t.test('correctly normalizes demo orders ORD-8821 and ORD-4092', () => {
    const o1 = normalizeOrder({
      orderNumber: 'ORD-8821',
      customerName: 'Sarah Chen',
      status: 'IN_TRANSIT',
      totalAmount: 349.5,
    })
    assert.equal(o1.orderNumber, 'ORD-8821')
    assert.equal(o1.customerName, 'Sarah Chen')
    assert.equal(o1.status, 'IN_TRANSIT')
    assert.equal(o1.totalAmount, 349.5)

    const o2 = normalizeOrder({
      orderNumber: 'ORD-4092',
      customerName: 'Marcus Vance',
      status: 'PROCESSING',
      totalAmount: 89.99,
    })
    assert.equal(o2.orderNumber, 'ORD-4092')
    assert.equal(o2.customerName, 'Marcus Vance')
    assert.equal(o2.status, 'PROCESSING')
    assert.equal(o2.totalAmount, 89.99)
  })

  await t.test('throws ApiError on missing orderNumber or non-object', () => {
    assert.throws(() => normalizeOrder(null), ApiError)
    assert.throws(() => normalizeOrder({}), ApiError)
    assert.throws(() => normalizeOrder('string'), ApiError)
  })
})

test('Frontend Status Tone Mapping', async (t) => {
  await t.test('maps DELIVERED and completed to success tone', () => {
    assert.equal(toneOf('DELIVERED').tone, 'success')
    assert.equal(toneOf('delivered').tone, 'success')
    assert.equal(toneOf('completed').tone, 'success')
  })

  await t.test('maps SHIPPED and in_transit to info tone', () => {
    assert.equal(toneOf('SHIPPED').tone, 'info')
    assert.equal(toneOf('in_transit').tone, 'info')
  })

  await t.test('maps PROCESSING and pending to warning tone', () => {
    assert.equal(toneOf('PROCESSING').tone, 'warning')
    assert.equal(toneOf('pending').tone, 'warning')
  })

  await t.test('maps CANCELLED and failed to danger tone', () => {
    assert.equal(toneOf('CANCELLED').tone, 'danger')
    assert.equal(toneOf('failed').tone, 'danger')
  })

  await t.test('maps unrecognised statuses safely to neutral tone', async () => {
    const { TONES } = await import('../src/lib/tones.js')
    assert.ok(TONES.success && TONES.info && TONES.warning && TONES.danger && TONES.neutral)
    assert.equal(toneOf('CUSTOM_WEIRD_STATUS').tone, 'neutral')
    assert.equal(toneOf(null).tone, 'neutral')
    assert.equal(toneOf(undefined).tone, 'neutral')
    const fallbackTone = TONES[toneOf('UNKNOWN').tone] ?? TONES.neutral
    assert.ok(fallbackTone.pill)
    assert.ok(fallbackTone.dot)
  })
})

test('Frontend Formatting Utilities', async (t) => {
  await t.test('extracts customer initials safely', () => {
    assert.equal(initials('Alex Rivera'), 'AR')
    assert.equal(initials('Madonna'), 'M')
    assert.equal(initials(''), '?')
    assert.equal(initials(null), '?')
  })

  await t.test('formats currency amounts cleanly', () => {
    const formatted = formatCurrency(200)
    assert.ok(formatted.includes('200'))
    assert.equal(formatCurrency(null), '—')
  })

  await t.test('formats date and relative time safely without crashing', () => {
    const now = new Date().toISOString()
    assert.ok(formatRelative(now))
    assert.ok(formatDateTime(now))
    assert.equal(formatRelative(null), '—')
    assert.equal(formatDateTime(null), '—')
  })
})

test('LiquidGL Configuration & Presets', async (t) => {
  const { CLARIFLOW_LIQUID_PRESETS, isLiquidGLSupported } = await import('../src/lib/liquidGL.js')

  await t.test('provides required presets with genuine refraction & tints', () => {
    assert.ok(CLARIFLOW_LIQUID_PRESETS.nav, 'Expected nav preset')
    assert.ok(CLARIFLOW_LIQUID_PRESETS.search, 'Expected search preset')
    assert.ok(CLARIFLOW_LIQUID_PRESETS.hero, 'Expected hero preset')
    assert.ok(CLARIFLOW_LIQUID_PRESETS.card, 'Expected card preset')
    assert.ok(CLARIFLOW_LIQUID_PRESETS.control, 'Expected control preset')

    // Preserves dark navy tint and genuine refraction
    assert.ok(CLARIFLOW_LIQUID_PRESETS.nav.tint.includes('rgba(7, 11, 22,'))
    assert.ok(CLARIFLOW_LIQUID_PRESETS.hero.refraction > 0)
    assert.equal(CLARIFLOW_LIQUID_PRESETS.hero.specular, true)
    assert.equal(CLARIFLOW_LIQUID_PRESETS.hero.interaction, 'fluid')
  })

  await t.test('gracefully handles non-browser environments without throwing', () => {
    assert.equal(isLiquidGLSupported(), false, 'Expected false outside browser')
  })
})

test('Role-Aware Order Status Lifecycle Transitions', async (t) => {
  const { getAllowedTransitions } = await import('../src/lib/lifecycle.js')

  await t.test('unauthenticated visitor has 0 allowed transitions (read-only)', () => {
    assert.deepEqual(getAllowedTransitions(null, 'PROCESSING'), [])
    assert.deepEqual(getAllowedTransitions(undefined, 'IN_TRANSIT'), [])
  })

  await t.test('staff can only transition PROCESSING or IN_TRANSIT to SHIPPED', () => {
    assert.deepEqual(getAllowedTransitions('staff', 'PROCESSING'), ['SHIPPED'])
    assert.deepEqual(getAllowedTransitions('staff', 'IN_TRANSIT'), ['SHIPPED'])
    assert.deepEqual(getAllowedTransitions('staff', 'SHIPPED'), [])
    assert.deepEqual(getAllowedTransitions('staff', 'DELIVERED'), [])
    assert.deepEqual(getAllowedTransitions('staff', 'CANCELLED'), [])
  })

  await t.test('manager can advance forward and cancel non-delivered orders', () => {
    const fromProc = getAllowedTransitions('manager', 'PROCESSING')
    assert.ok(fromProc.includes('IN_TRANSIT'))
    assert.ok(fromProc.includes('SHIPPED'))
    assert.ok(fromProc.includes('DELIVERED'))
    assert.ok(fromProc.includes('CANCELLED'))

    const fromShip = getAllowedTransitions('manager', 'SHIPPED')
    assert.deepEqual(fromShip, ['DELIVERED', 'CANCELLED'])

    assert.deepEqual(getAllowedTransitions('manager', 'DELIVERED'), [])
  })

  await t.test('admin can transition to any other valid status', () => {
    const fromProc = getAllowedTransitions('admin', 'PROCESSING')
    assert.deepEqual(fromProc, ['IN_TRANSIT', 'SHIPPED', 'DELIVERED', 'CANCELLED'])

    const fromDeliv = getAllowedTransitions('admin', 'DELIVERED')
    assert.deepEqual(fromDeliv, ['PROCESSING', 'IN_TRANSIT', 'SHIPPED', 'CANCELLED'])
  })
})

test('Frontend Protected Order API Client', async (t) => {
  const { getOrder } = await import('../src/api/orders.js')
  const originalFetch = global.fetch
  t.afterEach(() => {
    global.fetch = originalFetch
  })

  await t.test('getOrder() sends credentials: include to backend', async () => {
    let capturedOptions = null
    global.fetch = async (_url, options) => {
      capturedOptions = options
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            orderNumber: 'ORD-TEST-200',
            customerName: 'Alex Rivera',
            status: 'DELIVERED',
            totalAmount: 200,
          }),
      }
    }

    const order = await getOrder('ORD-TEST-200')
    assert.equal(order.orderNumber, 'ORD-TEST-200')
    assert.equal(capturedOptions.credentials, 'include', 'Expected credentials to be included for auth session')
  })

  await t.test('getOrder() throws ApiError with kind "unauthorized" on 401 unauthenticated response', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: 'Authentication required.' }),
    })

    await assert.rejects(
      async () => getOrder('ORD-TEST-200'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 401)
        assert.equal(err.kind, 'unauthorized')
        assert.equal(err.message, 'Authentication required.')
        return true
      }
    )
  })

  await t.test('getOrder() throws ApiError with kind "not_found" on 404 response', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: 'Order not found.' }),
    })

    await assert.rejects(
      async () => getOrder('ORD-UNKNOWN'),
      (err) => {
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 404)
        assert.equal(err.kind, 'not_found')
        return true
      }
    )
  })
})

test('Application Route & Navigation Mapping', async (t) => {
  const { NAV, ADMIN_NAV } = await import('../src/components/layout/nav.js')

  await t.test('NAV items map to protected workspace endpoints (/overview, /orders, /support)', () => {
    const paths = NAV.map((n) => n.to)
    assert.ok(paths.includes('/overview'), 'Expected Overview to map to /overview')
    assert.ok(paths.includes('/orders'), 'Expected Orders to map to /orders')
    assert.ok(paths.includes('/support'), 'Expected Support to map to /support')
    assert.ok(!paths.includes('/'), 'Root / must be reserved for the public landing page')
  })

  await t.test('ADMIN_NAV items map to admin-only routes (/team, /audit-logs)', () => {
    const paths = ADMIN_NAV.map((n) => n.to)
    assert.ok(paths.includes('/team'))
    assert.ok(paths.includes('/audit-logs'))
  })
})

