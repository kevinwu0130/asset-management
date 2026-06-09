import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'

const STATUS_LABEL = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }
const STATUS_COLOR = { IN_STOCK: '#22c55e', IN_USE: '#3b82f6', MAINTENANCE: '#f59e0b', RETIRED: '#9ca3af' }
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function StatCard({ icon, label, value, sub, warn }) {
  return (
    <div className={`card ${warn ? 'border-orange-200 bg-orange-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${warn ? 'text-orange-600' : 'text-gray-500'}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${warn ? 'text-orange-700' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className={`text-xs mt-1 ${warn ? 'text-orange-500' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.dashboard.get().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return null

  const barData = data.byStatus.map(b => ({ name: STATUS_LABEL[b.status] || b.status, count: b.count, fill: STATUS_COLOR[b.status] || '#6366f1' }))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">儀表板</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="資產總數" value={data.summary.totalAssets} />
        <StatCard icon="💰" label="資產總值" value={`$${(data.summary.totalValue || 0).toLocaleString()}`} />
        <StatCard icon="⏳" label="待審借用申請" value={data.summary.pendingLoans} warn={data.summary.pendingLoans > 0} />
        <StatCard icon="⚠️" label="即將到期保固" value={data.summary.expiringWarrantyCount} sub="30 天內" warn={data.summary.expiringWarrantyCount > 0} />
      </div>

      {/* Overdue alert */}
      {data.overdueLoans?.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚨</span>
            <h2 className="text-sm font-semibold text-red-700">逾期未還（{data.overdueLoans.length} 筆）</h2>
          </div>
          <div className="space-y-2">
            {data.overdueLoans.map(loan => (
              <div key={loan.id} className="flex items-center justify-between text-sm">
                <button onClick={() => navigate(`/assets/${loan.asset?.id}`)} className="text-red-700 hover:underline font-medium">
                  {loan.asset?.name} <span className="text-red-400 font-mono text-xs">{loan.asset?.assetTag}</span>
                </button>
                <div className="flex items-center gap-4 text-xs text-red-500">
                  <span>借用人：{loan.borrower?.name}</span>
                  <span>應還：{new Date(loan.expectedReturnAt).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">資產狀態分佈</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="數量" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">資產分類佔比</h2>
          {data.byCategory.length === 0
            ? <p className="text-sm text-gray-400 text-center py-16">尚無資料</p>
            : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={75}
                       label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {data.byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Recent logs & Expiring warranty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">最近操作紀錄</h2>
          <div className="space-y-2">
            {data.recentLogs.length === 0
              ? <p className="text-sm text-gray-400">尚無紀錄</p>
              : data.recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-gray-500">{log.user?.name}</span>
                  <span className="text-gray-700 truncate">{log.action} · {log.asset?.name}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">即將到期保固（30天內）</h2>
          {data.expiringWarranty.length === 0
            ? <p className="text-sm text-gray-400">目前無即將到期的保固</p>
            : data.expiringWarranty.map(a => (
              <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                <button onClick={() => navigate(`/assets/${a.id}`)} className="hover:underline text-left">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{a.assetTag}</span>
                </button>
                <span className="text-orange-600 text-xs">{new Date(a.warrantyExpiry).toLocaleDateString('zh-TW')}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
