import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext.jsx'
import { getUsers, createUser, updateUserRole, deleteUser } from '../api/auth.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { container } from '../lib/motion.js'
import { formatDateTime } from '../lib/format.js'

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }
const ROLE_COLORS = {
  admin:   'text-purple-300 border-purple-400/40 bg-purple-500/10',
  manager: 'text-indigo-300 border-indigo-400/40 bg-indigo-500/10',
  staff:   'text-slate-300 border-slate-400/30 bg-white/[0.04]',
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role] || ROLE_COLORS.staff}`}>
      <ShieldCheck className="size-3" />
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function InviteModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email and password are required.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const data = await createUser(form)
      onCreated(data.user)
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to create user.')
    } finally {
      setLoading(false)
    }
  }

  const field = (label, id, type, val, onChange, autoComplete) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={val}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        disabled={loading}
        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-void/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0f1a] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <UserPlus className="size-4" />
            </span>
            <h2 className="font-display text-base font-bold text-white">Add team member</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
          {field('Full name', 'inv-name', 'text', form.name, (e) => setForm({ ...form, name: e.target.value }), 'off')}
          {field('Email', 'inv-email', 'email', form.email, (e) => setForm({ ...form, email: e.target.value }), 'off')}
          {field('Temporary password', 'inv-password', 'password', form.password, (e) => setForm({ ...form, password: e.target.value }), 'new-password')}

          <div className="space-y-1.5">
            <label htmlFor="inv-role" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Role</label>
            <div className="relative">
              <select
                id="inv-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={loading}
                className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 pr-9 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-slate-300 hover:bg-white/[0.07] transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.4)] hover:opacity-90 disabled:opacity-60 transition"
            >
              {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : 'Create account'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function Team() {
  usePageTitle('Team')
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    setLoadingUsers(true)
    getUsers()
      .then((d) => setUsers(d.users))
      .catch((err) => setError(err?.message || 'Failed to load team members.'))
      .finally(() => setLoadingUsers(false))
  }, [])

  async function handleRoleChange(userId, newRole) {
    try {
      const data = await updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u)))
      showToast(`Role updated to ${ROLE_LABELS[newRole]}.`)
    } catch (err) {
      showToast(err?.message || 'Failed to update role.', 'error')
    }
  }

  async function handleDeactivate(userId, email) {
    if (!window.confirm(`Deactivate ${email}? They will lose access immediately.`)) return
    try {
      await deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      showToast(`${email} has been deactivated.`)
    } catch (err) {
      showToast(err?.message || 'Failed to deactivate user.', 'error')
    }
  }

  const roleOrder = { admin: 0, manager: 1, staff: 2 }
  const sorted = [...users].sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3))

  return (
    <motion.div variants={container(0.06)} initial="hidden" animate="show" className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl transition ${
          toast.type === 'error'
            ? 'border-rose-500/30 bg-rose-950/80 text-rose-200'
            : 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <Card liquid reveal className="p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-3.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Team</h1>
            <p className="text-sm font-medium text-slate-400">Manage access levels for your workspace.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.35)] hover:opacity-90 transition"
          >
            <UserPlus className="size-4" />
            Add member
          </button>
        </div>

        {/* Role key */}
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { role: 'admin', desc: 'Full access + user management' },
            { role: 'manager', desc: 'All order mutations + cancellation' },
            { role: 'staff', desc: 'PROCESSING → SHIPPED only' },
          ].map(({ role, desc }) => (
            <div key={role} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${ROLE_COLORS[role]}`}>
              <RoleBadge role={role} />
              <span className="text-xs text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Users table */}
      <Card liquid reveal className="overflow-hidden">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-6 text-rose-300">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto size-10 text-slate-600" />
            <p className="mt-3 text-sm text-slate-400">No team members yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/80 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 bg-white/[0.02]">
                  <th scope="col" className="px-5 py-3.5 font-semibold">Member</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">Role</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold hidden sm:table-cell">Joined</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="w-24 px-3 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {sorted.map((u) => {
                  const isSelf = u.id === me?.id
                  return (
                    <tr key={u.id} className="group hover:bg-white/[0.025] transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600/60 via-indigo-500/40 to-purple-500/40 text-sm font-bold text-white">
                            {u.name?.[0]?.toUpperCase() ?? <User className="size-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {u.name}
                              {isSelf && <span className="ml-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-indigo-300">You</span>}
                            </p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        {isSelf ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <div className="relative">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-2.5 pr-7 text-xs font-semibold text-white outline-none transition focus:border-indigo-400/60 hover:bg-white/[0.06] cursor-pointer"
                              aria-label={`Change role for ${u.name}`}
                            >
                              <option value="staff">Staff</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-slate-500" />
                          </div>
                        )}
                      </td>
                      <td className="hidden px-3 py-4 text-xs text-slate-400 sm:table-cell">
                        {u.createdAt ? formatDateTime(u.createdAt) : '—'}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          u.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        }`}>
                          <span className={`size-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(u.id, u.email)}
                            title="Deactivate user"
                            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            aria-label={`Deactivate ${u.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [...prev, newUser])
            showToast(`${newUser.name} added successfully.`)
          }}
        />
      )}
    </motion.div>
  )
}
