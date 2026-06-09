import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'

const STATUS_LABEL = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }
const STATUS_COLOR = { IN_STOCK: 'text-green-700 bg-green-50', IN_USE: 'text-blue-700 bg-blue-50', MAINTENANCE: 'text-yellow-700 bg-yellow-50', RETIRED: 'text-gray-600 bg-gray-50' }

// ── 統計報表 ──────────────────────────────────────────────
function SummaryReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (from) params.from = from
      if (to)   params.to   = to
      setData(await api.reports.summary(params))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalAssets = data?.byStatus.filter(s => s.status !== 'RETIRED').reduce((s, b) => s + b.count, 0) || 0
  const totalValue  = data?.byStatus.filter(s => s.status !== 'RETIRED').reduce((s, b) => s + b.totalValue, 0) || 0

  return (
    <div className="space-y-6">
      {/* 日期篩選 */}
      <div className="card py-4 flex items-end gap-4">
        <div>
          <label className="label">購買日期（起）</label>
          <input type="date" className="input w-40" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">購買日期（迄）</label>
          <input type="date" className="input w-40" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">查詢</button>
        <button onClick={() => { setFrom(''); setTo(''); }} className="btn-secondary">重置</button>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">載入中...</div> : !data ? null : (
        <>
          {/* 摘要卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card"><p className="text-sm text-gray-500">有效資產總數</p><p className="text-2xl font-bold mt-1">{totalAssets}</p></div>
            <div className="card"><p className="text-sm text-gray-500">資產總值</p><p className="text-2xl font-bold mt-1">${totalValue.toLocaleString()}</p></div>
            <div className="card"><p className="text-sm text-gray-500">資產分類數</p><p className="text-2xl font-bold mt-1">{data.byCategory.length}</p></div>
            <div className="card"><p className="text-sm text-gray-500">涵蓋地點數</p><p className="text-2xl font-bold mt-1">{data.byLocation.length}</p></div>
          </div>

          {/* 狀態分佈 */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">狀態分佈</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.byStatus.map(s => (
                <div key={s.status} className={`rounded-lg p-3 ${STATUS_COLOR[s.status] || 'bg-gray-50 text-gray-700'}`}>
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-xl font-bold mt-1">{s.count} 筆</p>
                  <p className="text-xs mt-0.5">${s.totalValue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 依分類 */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">依分類統計</h3>
              <table className="w-full text-sm">
                <thead><tr><th className="text-left py-1 text-xs text-gray-500">分類</th><th className="text-right py-1 text-xs text-gray-500">數量</th><th className="text-right py-1 text-xs text-gray-500">總值</th></tr></thead>
                <tbody>
                  {data.byCategory.map(r => (
                    <tr key={r.name} className="border-t border-gray-50">
                      <td className="py-1.5">{r.name}</td>
                      <td className="text-right text-gray-600">{r.count}</td>
                      <td className="text-right text-gray-600">${r.totalValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 依地點 */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">依地點統計</h3>
              <table className="w-full text-sm">
                <thead><tr><th className="text-left py-1 text-xs text-gray-500">地點</th><th className="text-right py-1 text-xs text-gray-500">數量</th><th className="text-right py-1 text-xs text-gray-500">總值</th></tr></thead>
                <tbody>
                  {data.byLocation.map(r => (
                    <tr key={r.name} className="border-t border-gray-50">
                      <td className="py-1.5">{r.name}</td>
                      <td className="text-right text-gray-600">{r.count}</td>
                      <td className="text-right text-gray-600">${r.totalValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 依保管人 */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">依保管人統計</h3>
              <table className="w-full text-sm">
                <thead><tr><th className="text-left py-1 text-xs text-gray-500">保管人</th><th className="text-right py-1 text-xs text-gray-500">數量</th><th className="text-right py-1 text-xs text-gray-500">總值</th></tr></thead>
                <tbody>
                  {data.byCustodian.map(r => (
                    <tr key={r.name} className="border-t border-gray-50">
                      <td className="py-1.5">{r.name}</td>
                      <td className="text-right text-gray-600">{r.count}</td>
                      <td className="text-right text-gray-600">${r.totalValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 資產盤點表 ────────────────────────────────────────────
function InventoryReport() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [filter, setFilter] = useState({ categoryId: '', locationId: '', status: '' })
  const printRef = useRef()

  async function load() {
    setLoading(true)
    const params = {}
    if (filter.categoryId) params.categoryId = filter.categoryId
    if (filter.locationId) params.locationId = filter.locationId
    if (filter.status)     params.status     = filter.status
    try { setAssets(await api.reports.inventory(params)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    Promise.all([api.categories.list(), api.locations.list()])
      .then(([c, l]) => { setCategories(c); setLocations(l) })
  }, [])

  useEffect(() => { load() }, [filter])

  function handlePrint() {
    const style = `
      <style>
        body { font-family: sans-serif; font-size: 12px; }
        h2 { text-align: center; margin-bottom: 4px; }
        p.sub { text-align: center; color: #666; margin-bottom: 12px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .check { width: 60px; }
        @media print { @page { size: A4 landscape; margin: 10mm; } }
      </style>`
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>資產盤點表</title>${style}</head><body>
      <h2>資產盤點表</h2>
      <p class="sub">列印日期：${new Date().toLocaleDateString('zh-TW')}　共 ${assets.length} 筆</p>
      ${printRef.current.outerHTML}
      <script>window.onload=()=>window.print()</script>
    </body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-4">
      {/* 篩選列 */}
      <div className="card py-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="label">分類</label>
          <select className="select w-36" value={filter.categoryId} onChange={e => setFilter(f => ({ ...f, categoryId: e.target.value }))}>
            <option value="">全部分類</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">地點</label>
          <select className="select w-36" value={filter.locationId} onChange={e => setFilter(f => ({ ...f, locationId: e.target.value }))}>
            <option value="">全部地點</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">狀態</label>
          <select className="select w-32" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">全部狀態</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => api.reports.exportInventory(filter)} className="btn-secondary">匯出 CSV</button>
          <button onClick={() => api.reports.exportInventoryXlsx(filter)} className="btn-secondary">匯出 Excel</button>
          <button onClick={handlePrint} className="btn-primary">🖨 列印盤點表</button>
        </div>
      </div>

      {/* 統計列 */}
      {!loading && (
        <div className="flex gap-4 text-sm text-gray-500">
          <span>共 <strong className="text-gray-800">{assets.length}</strong> 筆</span>
          <span>總值 <strong className="text-gray-800">${assets.reduce((s, a) => s + (a.purchaseAmount || 0), 0).toLocaleString()}</strong></span>
        </div>
      )}

      {/* 盤點表格 */}
      <div className="card p-0 overflow-x-auto">
        {loading
          ? <div className="text-center py-10 text-gray-400">載入中...</div>
          : (
            <table ref={printRef}>
              <thead>
                <tr>
                  <th className="w-10">序號</th>
                  <th>資產編號</th>
                  <th>名稱</th>
                  <th>分類</th>
                  <th>狀態</th>
                  <th>保管人</th>
                  <th>存放地點</th>
                  <th className="text-right">購買金額</th>
                  <th>備註</th>
                  <th className="w-20 bg-yellow-50 text-yellow-800">盤點結果</th>
                  <th className="w-24 bg-yellow-50 text-yellow-800">盤點人員</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0
                  ? <tr><td colSpan={11} className="text-center py-10 text-gray-400">無符合條件的資產</td></tr>
                  : assets.map((a, i) => (
                    <tr key={a.id}>
                      <td className="text-center text-gray-400">{i + 1}</td>
                      <td className="font-mono text-xs">{a.assetTag}</td>
                      <td className="font-medium">{a.name}</td>
                      <td className="text-gray-500">{a.category?.name || '-'}</td>
                      <td>
                        <span className={`badge text-xs ${
                          a.status === 'IN_STOCK' ? 'badge-green' :
                          a.status === 'IN_USE' ? 'badge-blue' :
                          a.status === 'MAINTENANCE' ? 'badge-yellow' : 'badge-gray'
                        }`}>{STATUS_LABEL[a.status]}</span>
                      </td>
                      <td className="text-gray-600">{a.custodian?.name || '-'}</td>
                      <td className="text-gray-600">{a.location?.name || '-'}</td>
                      <td className="text-right text-gray-600">{a.purchaseAmount ? `$${a.purchaseAmount.toLocaleString()}` : '-'}</td>
                      <td className="text-gray-400 text-xs">{a.notes || ''}</td>
                      <td className="bg-yellow-50"></td>
                      <td className="bg-yellow-50"></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}

// ── 主頁面 ────────────────────────────────────────────────
export default function Reports() {
  const [tab, setTab] = useState('summary')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">報表</h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[['summary', '📊 報表查詢'], ['inventory', '📋 資產盤點表']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' ? <SummaryReport /> : <InventoryReport />}
    </div>
  )
}
