import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/stok', label: 'Stok', end: false },
  { to: '/projeler', label: 'Projeler', end: false },
  { to: '/etiketler', label: 'Etiketler', end: false },
  { to: '/ayarlar', label: 'Ayarlar', end: false },
]

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-1 bg-slate-900 p-3 md:w-56 md:p-4">
        <div className="mb-1 px-2 md:mb-4">
          <div className="text-lg font-bold tracking-tight text-white">PMTS</div>
          <div className="hidden text-xs text-slate-400 md:block">Proje Mali Takip Sistemi</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                  isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
