import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

const STATUS_BADGE = { IN_STOCK: 'badge-green', IN_USE: 'badge-blue', MAINTENANCE: 'badge-yellow', RETIRED: 'badge-gray' }
const STATUS_LABEL = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }
const LOAN_BADGE   = { PENDING: 'bg-yellow-100 text-yellow-800', APPROVED: 'bg-blue-100 text-blue-800', RETURNED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800', OVERDUE: 'bg-red-200 text-red-900' }
const LOAN_LABEL   = { PENDING: '待審核', APPROVED: '借用中', RETURNED: '已歸還', REJECTED: '已拒絕', OVERDUE: '逾期' }

export default function MyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myAssets, setMyAssets] = useState([])
  const [myLoans, setMyLoans]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab] = useState('assets')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [assets, loans] = await Promise.all([
          api.assets.list({ custodianId: user.id, limit: 100 }),
          api.loans.list({ borrowerId: user.id, limit: 50 })
        ])
        setMyAssets(assets.data || [])
        setMyLoans(loans.data || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    if (user) load()
  }, [user])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">我的頁面</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.name} · {user?.email}</p>
        </div>
        <div className="text-sm text-gray-500 text-right">
          <p>保管資產：<strong className="text-gray-800">{myAssets.length}</strong> 筆</p>
          <p>借用記錄：<strong className="text-gray-800">{myLoans.length}</strong> 筆</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button onClick={() => setTab('assets')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'assets' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          我保管的資產 ({myAssets.length})
        </button>
        <button onClick={() => setTab('loans')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'loans' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          我的借用申請 ({myLoans.length})
        </button>
      </div>

      {tab === 'assets' && (
        <div className="card p-0 overflow-hidden">
          {myAssets.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">目前無保管資產</p>
            : <table>
                <thead>
                  <tr>
                    <th>資產編號</th>
                    <th>名稱</th>
                    <th>分類</th>
                    <th>狀態</th>
                    <th>存放地點</th>
                    <th>購買金額</th>
                    <th>保固到期</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssets.map(a => {
                    const expired = a.warrantyExpiry && new Date(a.warrantyExpiry) < new Date()
                    const expiring = a.warrantyExpiry && !expired && new Date(a.warrantyExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    return (
                      <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/assets/${a.id}`)}>
                        <td className="font-mono text-xs text-gray-500">{a.assetTag}</td>
                        <td className="font-medium">{a.name}</td>
                        <td className="text-gray-500">{a.category?.name || '-'}</td>
                        <td><span className={STATUS_BADGE[a.status] || 'badge-gray'}>{STATUS_LABEL[a.status]}</span></td>
                        <td className="text-gray-500">{a.location?.name || '-'}</td>
                        <td className="text-gray-600">{a.purchaseAmount ? `$${a.purchaseAmount.toLocaleString()}` : '-'}</td>
                        <td className={`text-xs ${expired ? 'text-red-600 font-medium' : expiring ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                          {a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString('zh-TW') : '-'}
                          {expired && ' (已到期)'}
                          {expiring && ' (即將到期)'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          }
        </div>
      )}

      {tab === 'loans' && (
        <div className="card p-0 overflow-hidden">
          {myLoans.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">目前無借用記錄</p>
            : <table>
                <thead>
                  <tr>
                    <th>資產</th>
                    <th>狀態</th>
                    <th>申請時間</th>
                    <th>預計歸還</th>
                    <th>實際歸還</th>
                    <th>備註</th>
                  </tr>
                </thead>
                <tbody>
                  {myLoans.map(loan => {
                    const overdue = loan.status === 'APPROVED' && loan.expectedReturnAt && new Date(loan.expectedReturnAt) < new Date()
                    return (
                      <tr key={loan.id} className={`cursor-pointer ${overdue ? 'bg-red-50' : ''}`}
                        onClick={() => loan.asset?.id && navigate(`/assets/${loan.asset.id}`)}>
                        <td>
                          <div className="font-medium text-sm">{loan.asset?.name || '-'}</div>
                          <div className="text-xs text-gray-400 font-mono">{loan.asset?.assetTag}</div>
                        </td>
                        <td>
                          <span className={`badge text-xs ${LOAN_BADGE[overdue ? 'OVERDUE' : loan.status] || 'bg-gray-100 text-gray-600'}`}>
                            {overdue ? '逾期' : LOAN_LABEL[loan.status] || loan.status}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500">{new Date(loan.requestedAt).toLocaleDateString('zh-TW')}</td>
                        <td className="text-xs text-gray-500">{loan.expectedReturnAt ? new Date(loan.expectedReturnAt).toLocaleDateString('zh-TW') : '-'}</td>
                        <td className="text-xs text-gray-500">{loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString('zh-TW') : '-'}</td>
                        <td className="text-xs text-gray-400">{loan.notes || loan.rejectReason || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          }
        </div>
      )}
    </div>
  )
}
