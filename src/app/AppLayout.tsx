import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './PageTransition'
import { NAV_ITEMS } from './navItems'

// ─── Shared nav item renderer ─────────────────────────────────────────────────

type NavItemProps = {
  path: string
  label: string
  icon: React.ReactElement
  layout: 'bottom' | 'sidebar'
}

function AppNavItem({ path, label, icon, layout }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        layout === 'bottom'
          ? [
              'flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors duration-150',
              isActive
                ? 'text-accent drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]'
                : 'text-void-400 hover:text-void-200',
            ].join(' ')
          : [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group',
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-void-400 hover:bg-void-700 hover:text-void-100',
            ].join(' ')
      }
    >
      <span className={layout === 'sidebar' ? 'shrink-0' : ''}>{icon}</span>
      <span className={layout === 'bottom' ? 'leading-none' : 'hidden xl:block'}>{label}</span>
    </NavLink>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function AppLayout() {
  const location = useLocation()

  return (
    // Outer wrapper: row on large screens (sidebar + content), column on mobile
    <div className="flex flex-col lg:flex-row h-screen bg-void-900 overflow-hidden">

      {/* ── Desktop left sidebar (lg+) ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-20 xl:w-64 shrink-0 border-r border-void-700 bg-void-900 py-6 px-2 xl:px-4 gap-1">
        {/* Logo mark */}
        <div className="mb-6 px-1 xl:px-2">
          <span className="text-accent font-bold text-lg tracking-tight hidden xl:block">HeroPath</span>
          <span className="text-accent font-bold text-xl xl:hidden flex justify-center">H</span>
        </div>

        {NAV_ITEMS.map((item) => (
          <AppNavItem key={item.path} layout="sidebar" {...item} />
        ))}
      </aside>

      {/* ── Scrollable content area ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 relative">
        <AnimatePresence mode="sync">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* ── Mobile/tablet bottom nav (< lg) ─────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch
          bg-void-800/90 backdrop-blur-md border-t border-void-700
          safe-area-inset-bottom"
        style={{ height: '56px' }}
      >
        {NAV_ITEMS.map((item) => (
          <AppNavItem key={item.path} layout="bottom" {...item} />
        ))}
      </nav>

    </div>
  )
}
