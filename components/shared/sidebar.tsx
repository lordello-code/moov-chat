'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Store, FileText, Bike,
  List, MessageSquare, BarChart2, Users, Settings, CheckSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  gerenteOnly?: boolean
}

function getAdminNavItems(): NavItem[] {
  return [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Lojas',     href: '/lojas',     icon: Store },
    { label: 'Catálogo',  href: '/catalogo',  icon: Bike },
    { label: 'Prompts',   href: '/prompts',   icon: FileText },
  ]
}

function getLojaNavItems(slug: string): NavItem[] {
  return [
    { label: 'Fila',       href: `/${slug}/fila`,       icon: List },
    { label: 'Inbox',      href: `/${slug}/inbox`,      icon: MessageSquare },
    { label: 'Catálogo',   href: `/${slug}/catalogo`,   icon: Bike,        gerenteOnly: true },
    { label: 'Métricas',   href: `/${slug}/metricas`,   icon: BarChart2,   gerenteOnly: true },
    { label: 'Equipe',     href: `/${slug}/equipe`,     icon: Users,       gerenteOnly: true },
    { label: 'Config',     href: `/${slug}/config`,     icon: Settings,    gerenteOnly: true },
    { label: 'Aprovações', href: `/${slug}/aprovacoes`, icon: CheckSquare, gerenteOnly: true },
  ]
}

interface SidebarProps {
  variant: 'admin' | 'loja'
  role: string
  tenantSlug?: string
}

export function Sidebar({ variant, role, tenantSlug = '' }: SidebarProps) {
  const pathname = usePathname()
  const items = variant === 'admin' ? getAdminNavItems() : getLojaNavItems(tenantSlug)

  return (
    <aside className="w-60 min-h-screen bg-background border-r border-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="text-foreground font-bold text-lg">MOOV Chat</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items
          .filter(item => !item.gerenteOnly || role !== 'VENDEDOR')
          .map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  )
}