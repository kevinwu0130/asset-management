import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'

const nav = [
  { to: '/', label: '儀表板', icon: '📊', exact: true },
  { to: '/assets', label: '資產管理', icon: '📦' },
  { to: '/loans', label: '借還管理', icon: '🔄' },
  { to: '/reports', label: '報表', icon: '📋' },
  { to: '/logs', label: '異動紀錄', icon: '🗂️' },
  { to: '/scan', label: '掃碼盤點', icon: '📷' },
  { to: '/me', label: '我的頁面', icon: '👤' },
]

function NotificationBell({ counts }) {
  const [open, setOpen] = useState(false)
  const total = (counts.pending || 0) + (counts.expiring || 0) + (counts.overdue || 0)

  if (total === 0) return null

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <span className="text-lg">🔔</span>
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {total > 9 ? '9+' : total}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600">通知提醒</p>
            </div>
            <div className="divide-y divide-gray-50">
              {counts.pending > 0 && (
                <div className="px-3 py-2.5 flex items-center gap-2">
                  <span>⏳</span>
                  <p className="text-xs text-gray-700"><strong>{counts.pending}</strong> 筆借用申請待審核</p>
                </div>
              )}
              {counts.overdue > 0 && (
                <div className="px-3 py-2.5 flex items-center gap-2 bg-red-50">
                  <span>🚨</span>
                  <p className="text-xs text-red-700"><strong>{counts.overdue}</strong> 筆借用已逾期未還</p>
                </div>
              )}
              {counts.expiring > 0 && (
                <div className="px-3 py-2.5 flex items-center gap-2 bg-orange-50">
                  <span>⚠️</span>
                  <p className="text-xs text-orange-700"><strong>{counts.expiring}</strong> 筆保固 30 天內到期</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [notifCounts, setNotifCounts] = useState({ pending: 0, expiring: 0, overdue: 0 })

  useEffect(() => {
    api.dashboard.get().then(d => {
      setNotifCounts({
        pending: d.summary?.pendingLoans || 0,
        expiring: d.summary?.expiringWarrantyCount || 0,
        overdue: d.summary?.overdueLoansCount || 0
      })
    }).catch(() => {})
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-base font-bold text-indigo-600">📋 資產管理系統</h1>
          <NotificationBell counts={notifCounts} />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{icon}</span>{label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/users"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>👥</span>使用者管理
            </NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="px-3 py-2 text-xs text-gray-500 mb-1">
            <div className="font-medium text-gray-700">{user?.name}</div>
            <div>{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            登出
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
