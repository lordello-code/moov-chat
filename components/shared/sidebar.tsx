'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  gerenteOnly?: boolean
}

interface SidebarProps {
  items: NavItem[]
  role: string
}

export function Sidebar({ items, role }: SidebarProps) {
  const pathname = usePathname()

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
