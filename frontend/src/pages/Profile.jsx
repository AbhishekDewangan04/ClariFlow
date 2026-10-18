import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, CheckCircle2, Info, Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext.jsx'
import { updateProfile } from '../api/auth.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { container, item } from '../lib/motion.js'

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }
const ROLE_BADGE_STYLES = {
  admin: 'border-purple-400/40 bg-purple-500/15 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
  manager: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
  staff: 'border-slate-500/40 bg-white/[0.06] text-slate-200',
}

const ROLE_DESCRIPTIONS = {
  admin: 'Full system privileges including user creation, role assignment, audit logs inspection, and full order mutations.',
  manager: 'Operational authority to manage order fulfillment cycles and cancel orders. Cannot manage team accounts or roles.',
  staff: 'Standard warehouse operator authority to view orders and progress processing orders to shipped.',
}

export default function Profile() {
  usePageTitle('Profile Settings')
  const { user, updateUser } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user?.name])

  async function handleSave(e) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setErrorMsg('Display name cannot be empty.')
      return
    }
    if (trimmed.length > 100) {
      setErrorMsg('Display name cannot exceed 100 characters.')
      return
    }

    setSaving(true)
    try {
      const res = await updateProfile({ name: trimmed })
      if (res?.user) {
        updateUser(res.user)
      } else {
        updateUser({ name: trimmed })
      }
      setSuccessMsg('Your profile has been successfully updated.')
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const roleKey = user?.role || 'staff'

  return (
    <motion.div
      variants={container()}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl"
    >
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account profile information and inspect assigned workspace privileges.
        </p>
      </div>

      {/* Status Alerts */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
        >
          <AlertCircle className="size-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Main Profile Form Card */}
      <Card reveal liquid className="p-6 sm:p-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-edge/60">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-xl font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.4)]">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE_STYLES[roleKey]}`}>
                  <ShieldCheck className="size-3.5" />
                  {ROLE_LABELS[roleKey] || roleKey}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Display Name
              </label>
              <div className="relative">
                <input
                  id="displayName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={100}
                  className="w-full rounded-xl border border-white/10 bg-[#090d1a]/80 px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Visible to teammates across activity feeds, order notes, and audit logs.
              </p>
            </div>

            {/* Email Address (Read-only) */}
            <div className="space-y-1.5">
              <label htmlFor="emailAddress" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="emailAddress"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                  className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed select-none"
                />
                <Lock className="pointer-events-none absolute right-3.5 top-3 size-4 text-slate-500" />
              </div>
              <p className="text-[11px] text-slate-500">
                Email is tied to your organization identity and cannot be altered directly.
              </p>
            </div>
          </div>

          {/* Role & Privileges Information */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                <ShieldCheck className="size-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Assigned Role: {ROLE_LABELS[roleKey] || roleKey}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {ROLE_DESCRIPTIONS[roleKey]}
                </p>
                <p className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5">
                  <Info className="size-3.5 text-slate-500 shrink-0" />
                  <span>
                    Roles and administrative permissions are enforced by the server and managed exclusively by workspace Administrators via the Team page.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving || !name.trim() || name.trim() === user?.name}
              className="px-5"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  )
}
