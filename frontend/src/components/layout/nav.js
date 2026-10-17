import { Box, History, LayoutGrid, MessageSquare, Users } from 'lucide-react'

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/orders', label: 'Orders', icon: Box },
  { to: '/support', label: 'Support', icon: MessageSquare, tag: 'PREVIEW' },
]

/** Items only visible when the user has admin role. */
export const ADMIN_NAV = [
  { to: '/team', label: 'Team', icon: Users },
  { to: '/audit-logs', label: 'Audit Logs', icon: History },
]

