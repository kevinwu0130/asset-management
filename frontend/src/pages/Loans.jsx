import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

const STATUS_LABEL = { PENDING: '待審核', APPROVED: '借用中', REJECTED: '已拒絕', RETURNED: '已歸還', OVERDUE: '逾期' }
const STATUS_BADGE = { PENDING: 'badge-orange', APPROVED: 'badge-blue', REJECTED: 'badge-red', RETURNED: 'badge-gray', OVERDUE: 'badge-red' }

export default function Loans() {
  const [loans, setLoans] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const { isManager } = useAuth()

  async function load(p = page) {
    setLoading(true)
    try {
      const data = await api.loans.list({ page: p, limit: 20, status: statusFilter })
      setLoans(data.data)
      setPagination(data.pagination)
    } finally { setLoading(false) }
  }

  useEffect(() => { setPage(1); load(1) }, [statusFilter])
  useEffect(() => { load(page) }, [page])

  async function act(fn, ...args) {
    try { await fn(...args); load(page) }
    catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">借還管理</h1>
        <select className="select w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">全部狀態</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>資產</th><th>借用人</th><th>申請時間</th>
              <th>預計歸還</th><th>狀態</th>
              {isManager && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">載入中...</td></tr>
              : loans.length === 0
                ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">無資料</td></tr>
                : loans.map(loan => (
                  <tr key={loan.id}>
                    <td>
                      <div className="font-medium">{loan.asset?.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{loan.asset?.assetTag}</div>
                    </td>
                    <td className="text-gray-600">{loan.borrower?.name}</td>
                    <td className="text-gray-500 text-xs">{new Date(loan.requestedAt).toLocaleString('zh-TW')}</td>
                    <td className="text-gray-500 text-xs">{loan.expectedReturnAt ? new Date(loan.expectedReturnAt).toLocaleDateString('zh-TW') : '-'}</td>
                    <td><span className={STATUS_BADGE[loan.status] || 'badge-gray'}>{STATUS_LABEL[loan.status] || loan.status}</span></td>
                    {isManager && (
                      <td>
                        <div className="flex gap-1">
                          {loan.status === 'PENDING' && (
                            <>
                              <button onClick={() => act(api.loans.approve, loan.id)} className="btn-primary btn-sm">核准</button>
                              <button onClick={() => { const r = prompt('拒絕原因'); if (r !== null) act(api.loans.reject, loan.id, r) }} className="btn-danger btn-sm">拒絕</button>
                            </>
                          )}
                          {loan.status === 'APPROVED' && (
                            <button onClick={() => act(api.loans.return, loan.id)} className="btn-secondary btn-sm">確認歸還</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
            }
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">共 {pagination.total} 筆</span>
            <div className="flex gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-xs rounded ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
