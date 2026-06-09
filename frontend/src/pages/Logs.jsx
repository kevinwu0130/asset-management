import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const ACTION_BADGE = {
  CREATED:           'bg-green-100 text-green-800',
  UPDATED:           'bg-blue-100 text-blue-800',
  STATUS_CHANGED:    'bg-purple-100 text-purple-800',
  CUSTODIAN_CHANGED: 'bg-orange-100 text-orange-800',
  LOCATION_CHANGED:  'bg-cyan-100 text-cyan-800',
  RETIRED:           'bg-gray-100 text-gray-700',
}

const ACTIONS = [
  { value: 'CREATED',           label: '建立' },
  { value: 'UPDATED',           label: '更新' },
  { value: 'STATUS_CHANGED',    label: '狀態變更' },
  { value: 'CUSTODIAN_CHANGED', label: '保管人變更' },
  { value: 'LOCATION_CHANGED',  label: '地點變更' },
  { value: 'RETIRED',           label: '報廢' },
]

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState({ search: '', action: '', from: '', to: '' })
  const navigate = useNavigate()

  async function load(p = 1) {
    setLoading(true)
    const params = { page: p, limit: 50 }
    if (filter.search) params.search = filter.search
    if (filter.action) params.action = filter.action
    if (filter.from)   params.from   = filter.from
    if (filter.to)     params.to     = filter.to
    try {
      const data = await api.logs.list(params)
      setLogs(data.data)
      setPagination(data.pagination)
    } finally { setLoading(false) }
  }

  useEffect(() => { setPage(1); load(1) }, [filter])

  const setF = f => e => setFilter(v => ({ ...v, [f]: e.target.value }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">資產異動紀錄</h1>

      {/* 篩選 */}
      <div className="card py-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">搜尋資產</label>
          <input className="input w-48" placeholder="名稱或編號..." value={filter.search} onChange={setF('search')} />
        </div>
        <div>
          <label className="label">操作類型</label>
          <select className="select w-36" value={filter.action} onChange={setF('action')}>
            <option value="">全部類型</option>
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">日期（起）</label>
          <input type="date" className="input w-40" value={filter.from} onChange={setF('from')} />
        </div>
        <div>
          <label className="label">日期（迄）</label>
          <input type="date" className="input w-40" value={filter.to} onChange={setF('to')} />
        </div>
        {(filter.search || filter.action || filter.from || filter.to) && (
          <button onClick={() => setFilter({ search: '', action: '', from: '', to: '' })} className="text-xs text-red-500 hover:underline self-end mb-2">清除</button>
        )}
      </div>

      {!loading && <p className="text-sm text-gray-500">共 <strong className="text-gray-800">{pagination.total}</strong> 筆紀錄</p>}

      {/* 表格 */}
      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>時間</th>
              <th>資產</th>
              <th>操作</th>
              <th>欄位</th>
              <th>變更前</th>
              <th>變更後</th>
              <th>操作人員</th>
              <th>備註</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">載入中...</td></tr>
              : logs.length === 0
                ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">無異動紀錄</td></tr>
                : logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/assets/${log.asset?.id}`)}
                        className="text-indigo-600 hover:underline text-left"
                      >
                        <div className="font-medium text-sm">{log.asset?.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{log.asset?.assetTag}</div>
                      </button>
                    </td>
                    <td>
                      <span className={`badge text-xs ${ACTION_BADGE[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.actionLabel}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">{log.field || '-'}</td>
                    <td className="text-sm">
                      {log.fromValue && log.fromValue !== '-'
                        ? <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-xs">{log.fromValue}</span>
                        : <span className="text-gray-300">-</span>
                      }
                    </td>
                    <td className="text-sm">
                      {log.toValue && log.toValue !== '-'
                        ? <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs">{log.toValue}</span>
                        : <span className="text-gray-300">-</span>
                      }
                    </td>
                    <td className="text-sm text-gray-600">{log.user?.name}</td>
                    <td className="text-xs text-gray-400">{log.notes || ''}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">第 {page} / {pagination.totalPages} 頁</span>
            <div className="flex gap-1">
              <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p) }} disabled={page === 1} className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40">上一頁</button>
              <button onClick={() => { const p = Math.min(pagination.totalPages, page + 1); setPage(p); load(p) }} disabled={page === pagination.totalPages} className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40">下一頁</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
