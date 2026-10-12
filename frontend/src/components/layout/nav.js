import { Box, LayoutGrid, MessageSquare } from 'lucide-react'

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/orders', label: 'Orders', icon: Box },
  { to: '/support', label: 'Support', icon: MessageSquare, tag: 'PREVIEW' },
]
