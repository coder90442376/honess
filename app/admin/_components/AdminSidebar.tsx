'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
  BadgeCheck,
  ShieldAlert,
  Settings,
  MessageSquareWarning,
  ScrollText,
  FileBarChart,
  LineChart,
  Sparkles,
  Building2,
  ArrowUpCircle,
} from 'lucide-react'
import { hasPerm } from '../_lib/format'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission: string
}

// Order mirrors AD-01..AD-10.
const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} />, permission: 'dashboard:view' },
  { label: 'Analytics', href: '/admin/analytics', icon: <LineChart size={20} />, permission: 'analytics:view' },
  { label: 'Campaign Queue', href: '/admin/moderation', icon: <ShieldCheck size={20} />, permission: 'campaign_moderation:view' },
  { label: 'Campaign Upgrades', href: '/admin/moderation/campaign-upgrades', icon: <ArrowUpCircle size={20} />, permission: 'campaign_moderation:view' },
  { label: 'Users', href: '/admin/users', icon: <Users size={20} />, permission: 'user:view' },
  { label: 'Finance', href: '/admin/finance', icon: <Wallet size={20} />, permission: 'finance:view' },
  { label: 'Verifications', href: '/admin/verifications', icon: <BadgeCheck size={20} />, permission: 'verification:view' },
  { label: 'Business Verify', href: '/admin/business-verifications', icon: <Building2 size={20} />, permission: 'verification:view' },
  { label: 'Fraud', href: '/admin/fraud', icon: <ShieldAlert size={20} />, permission: 'fraud:view' },
  { label: 'Configuration', href: '/admin/config', icon: <Settings size={20} />, permission: 'config:view' },
  { label: 'Content', href: '/admin/content', icon: <MessageSquareWarning size={20} />, permission: 'content_moderation:view' },
  { label: 'Audit Log', href: '/admin/audit', icon: <ScrollText size={20} />, permission: 'audit:view' },
  { label: 'Reports', href: '/admin/reports', icon: <FileBarChart size={20} />, permission: 'finance:reports' },
  { label: 'AI', href: '/admin/ai', icon: <Sparkles size={20} />, permission: 'ai:view' },
]

/* Dark "ink" fixed sidebar — mirrors the /dashboard chrome. Desktop only:
   hidden below 1024px with no mobile replacement (per design decision). */
const Sidebar = styled.aside`
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #18171A;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 200;

  @media (max-width: 1024px) { display: none; }
`
const Head = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 1.5rem 1.25rem 1.25rem;
  border-bottom: 1px solid #3D3A44;
`
const LogoMark = styled.div`
  width: 32px; height: 32px; flex-shrink: 0;
  background: #D4870A; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.875rem; color: #18171A;
`
const Title = styled.span`
  font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700;
  color: #ffffff; letter-spacing: -0.3px; white-space: nowrap;
`
const Nav = styled.nav`
  flex: 1; display: flex; flex-direction: column; gap: 2px;
  padding: 1.25rem 0.75rem; overflow-y: auto;
`
const Item = styled(Link)<{ $active: boolean }>`
  display: flex; align-items: center; gap: 10px; padding: 0.625rem 0.75rem;
  border-radius: 8px; text-decoration: none; white-space: nowrap; position: relative;
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  color: ${(p) => (p.$active ? '#ffffff' : '#8C8790')};
  background: ${(p) => (p.$active ? '#302E35' : 'transparent')};
  font-weight: ${(p) => (p.$active ? 500 : 400)};
  transition: background 140ms, color 140ms;
  &:hover { background: #242228; color: #ffffff; }
  ${(p) =>
    p.$active &&
    `&::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      background: #D4870A;
      border-radius: 0 3px 3px 0;
    }`}
`

export default function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname()
  const items = NAV.filter((i) => hasPerm(permissions, i.permission))
  // `startsWith` alone would highlight "Campaign Queue" while on
  // /admin/moderation/campaign-upgrades. Deeper routes win, so only the most
  // specific matching entry is marked active.
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    if (!pathname.startsWith(href)) return false
    return !items.some((i) => i.href !== href && i.href.startsWith(href) && pathname.startsWith(i.href))
  }

  return (
    <Sidebar>
      <Head>
        <LogoMark>HN</LogoMark>
        <Title>HonestNeed Admin</Title>
      </Head>
      <Nav>
        {items.map((i) => (
          <Item key={i.href} href={i.href} $active={isActive(i.href)} title={i.label}>
            {i.icon}
            {i.label}
          </Item>
        ))}
      </Nav>
    </Sidebar>
  )
}
