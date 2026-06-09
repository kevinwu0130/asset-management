import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import AssetForm from '../components/AssetForm'
import CategoryLocationManager from '../components/CategoryLocationManager'

const STATUS_BADGE = {
  IN_STOCK: 'badge-green', IN_USE: 'badge-blue',
  MAINTENANCE: 'badge-yellow', RETIRED: 'badge-gray'
}
const STATUS_LABEL = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }

function SortTh({ label, field, sortBy, sortOrder, onSort }) {
  const active = sortBy === field
  return (
    <th className="cursor-pointer select-none" onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-xs ${active ? 'text-indigo-500' : 'text-gray-300'}`}>
          {active ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

function BatchQRModal({ assets, onClose }) {
  function handlePrint() {
    const w = window.open('', '_blank', 'width=800,height=600')
    const items = assets.map(a => `
      <div style="display:inline-block;text-align:center;margin:8px;padding:12px;border:1px solid #ddd;border-radius:8px;width:140px">
        <div id="qr-${a.id}"></div>
        <p style="font-size:12px;font-weight:600;margin:4px 0">${a.name}</p>
        <p style="font-size:10px;color:#888;font-family:monospace;margin:0">${a.assetTag}</p>
      </div>`).join('')
    w.document.write(`<html><head><title>QR Codes</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      <style>body{padding:16px}@media print{body{padding:0}}</style></head>
      <body>${items}<script>
        ${assets.map(a => `new QRCode(document.getElementById('qr-${a.id}'),{text:'${window.location.origin}/assets/${a.id}',width:100,height:100})`).join(';')}
        setTimeout(()=>window.print(),800)
      <\/script></body></html>`)
    w.document.close()
  }

  return (
    <Modal title={`批次列印 QR Code（${assets.length} 筆）`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto">
          {assets.map(a => (
            <div key={a.id} className="flex flex-col items-center p-2 border border-gray-100 rounded-lg">
              <QRCodeSVG value={`${window.location.origin}/assets/${a.id}`} size={80} />
              <p className="text-xs font-medium text-gray-700 mt-1 text-center truncate w-full">{a.name}</p>
              <p className="text-xs text-gray-400 font-mono">{a.assetTag}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={handlePrint} className="btn-primary">🖨 列印全部</button>
        </div>
      </div>
    </Modal>
  )
}

function BulkActionBar({ selected, assets, users, categories, locations, onDone, onClear }) {
  const [action, setAction] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleApply() {
    if (!action || value === '') return
    setSaving(true)
    try {
      await api.post('/assets/bulk', { ids: selected, field: action, value })
      onDone()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const fieldOpts = [
    { value: 'status',      label: '狀態' },
    { value: 'custodianId', label: '保管人' },
    { value: 'locationId',  label: '地點' },
    { value: 'categoryId',  label: '分類' },
  ]

  return (
    <div className="card py-3 flex items-center gap-3 bg-indigo-50 border-indigo-200 flex-wrap">
      <span className="text-sm font-medium text-indigo-700">已選 {selected.length} 筆</span>
      <select className="select w-28 text-xs" value={action} onChange={e => { setAction(e.target.value); setValue('') }}>
        <option value="">批次變更...</option>
        {fieldOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {action === 'status' && (
        <select className="select w-28 text-xs" value={value} onChange={e => setValue(e.target.value)}>
          <option value="">選擇狀態</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
      {action === 'custodianId' && (
        <select className="select w-32 text-xs" value={value} onChange={e => setValue(e.target.value)}>
          <option value="">選擇保管人</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
      {action === 'locationId' && (
        <select className="select w-32 text-xs" value={value} onChange={e => setValue(e.target.value)}>
          <option value="">選擇地點</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      {action === 'categoryId' && (
        <select className="select w-32 text-xs" value={value} onChange={e => setValue(e.target.value)}>
          <option value="">選擇分類</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <button onClick={handleApply} disabled={!action || value === '' || saving} className="btn-primary text-xs py-1.5 px-3">
        {saving ? '套用中...' : '套用'}
      </button>
      <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">取消選取</button>
    </div>
  )
}

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [showManager, setShowManager] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [selected, setSelected] = useState([])
  const [showBatchQR, setShowBatchQR] = useState(false)

  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [adv, setAdv] = useState({ custodianId: '', categoryId: '', locationId: '', purchaseDateFrom: '', purchaseDateTo: '', amountMin: '', amountMax: '' })

  const fileRef = useRef()
  const { isManager } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.users.list().catch(() => []), api.categories.list(), api.locations.list()])
      .then(([u, c, l]) => { setUsers(u); setCategories(c); setLocations(l) })
  }, [])

  function handleSort(field) {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('asc') }
  }

  async function load(p = 1) {
    setLoading(true)
    try {
      const params = { page: p, limit: 20, search, status: statusFilter, sortBy, sortOrder, ...adv }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const data = await api.assets.list(params)
      setAssets(data.data)
      setPagination(data.pagination)
    } finally { setLoading(false) }
  }

  useEffect(() => { setPage(1); load(1) }, [search, statusFilter, sortBy, sortOrder, adv])

  async function handleStatusChange(assetId, newStatus) {
    try {
      await api.assets.update(assetId, { status: newStatus })
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: newStatus } : a))
    } catch (err) { alert(err.message) }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setImportMsg('')
    try {
      const result = await api.assets.importCsv(file)
      setImportMsg(`匯入完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆`)
      load(page)
    } catch (err) { setImportMsg(`匯入失敗：${err.message}`) }
    finally { setImporting(false); e.target.value = '' }
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleAll() {
    const pageIds = assets.map(a => a.id)
    const allSelected = pageIds.every(id => selected.includes(id))
    if (allSelected) setSelected(prev => prev.filter(id => !pageIds.includes(id)))
    else setSelected(prev => [...new Set([...prev, ...pageIds])])
  }

  const setA = f => e => setAdv(v => ({ ...v, [f]: e.target.value }))
  const hasAdv = Object.values(adv).some(Boolean)
  const pageIds = assets.map(a => a.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.includes(id))
  const selectedAssets = assets.filter(a => selected.includes(a.id))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">資產管理</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          {isManager && (
            <>
              <button onClick={() => setShowManager(true)} className="btn-secondary">⚙ 分類/地點</button>
              <button onClick={() => api.reports.exportAssetsXlsx()} className="btn-secondary">匯出 Excel</button>
              <button onClick={() => api.assets.exportCsv()} className="btn-secondary">匯出 CSV</button>
              <button onClick={() => fileRef.current.click()} disabled={importing} className="btn-secondary">{importing ? '匯入中...' : '匯入 CSV'}</button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
              <button onClick={() => setShowForm(true)} className="btn-primary">＋ 新增資產</button>
            </>
          )}
        </div>
      </div>

      {importMsg && <div className={`p-3 rounded-lg text-sm ${importMsg.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{importMsg}</div>}

      {/* 基本篩選 */}
      <div className="flex gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="搜尋名稱、編號..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">全部狀態</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => setShowAdvanced(v => !v)} className={`btn-secondary text-xs ${hasAdv ? 'border-indigo-400 text-indigo-600' : ''}`}>
          進階篩選 {hasAdv ? '●' : ''} {showAdvanced ? '▲' : '▼'}
        </button>
        {hasAdv && <button onClick={() => setAdv({ custodianId: '', categoryId: '', locationId: '', purchaseDateFrom: '', purchaseDateTo: '', amountMin: '', amountMax: '' })} className="text-xs text-red-500 hover:underline">清除篩選</button>}
      </div>

      {/* 進階篩選面板 */}
      {showAdvanced && (
        <div className="card py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">分類</label>
            <select className="select" value={adv.categoryId} onChange={setA('categoryId')}>
              <option value="">全部</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">地點</label>
            <select className="select" value={adv.locationId} onChange={setA('locationId')}>
              <option value="">全部</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">保管人</label>
            <select className="select" value={adv.custodianId} onChange={setA('custodianId')}>
              <option value="">全部</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">購買日期（起）</label>
            <input type="date" className="input" value={adv.purchaseDateFrom} onChange={setA('purchaseDateFrom')} />
          </div>
          <div>
            <label className="label">購買日期（迄）</label>
            <input type="date" className="input" value={adv.purchaseDateTo} onChange={setA('purchaseDateTo')} />
          </div>
          <div>
            <label className="label">金額下限</label>
            <input type="number" className="input" placeholder="0" value={adv.amountMin} onChange={setA('amountMin')} min="0" />
          </div>
          <div>
            <label className="label">金額上限</label>
            <input type="number" className="input" placeholder="不限" value={adv.amountMax} onChange={setA('amountMax')} min="0" />
          </div>
        </div>
      )}

      {/* 批次操作 */}
      {selected.length > 0 && isManager && (
        <div className="space-y-2">
          <BulkActionBar
            selected={selected}
            assets={assets}
            users={users}
            categories={categories}
            locations={locations}
            onDone={() => { setSelected([]); load(page) }}
            onClear={() => setSelected([])}
          />
          <button onClick={() => setShowBatchQR(true)} className="btn-secondary text-xs">
            🖨 列印選取 QR Code（{selectedAssets.length} 筆）
          </button>
        </div>
      )}

      {/* 表格 */}
      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              {isManager && (
                <th className="w-8">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="rounded" />
                </th>
              )}
              <SortTh label="編號"     field="assetTag"       sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh label="名稱"     field="name"           sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh label="分類"     field="categoryId"     sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>狀態</th>
              <SortTh label="保管人"   field="custodianId"    sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>地點</th>
              <SortTh label="購買金額" field="purchaseAmount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={isManager ? 8 : 7} className="text-center py-10 text-gray-400">載入中...</td></tr>
              : assets.length === 0
                ? <tr><td colSpan={isManager ? 8 : 7} className="text-center py-10 text-gray-400">無符合條件的資產</td></tr>
                : assets.map(a => (
                  <tr key={a.id} className={`cursor-pointer ${selected.includes(a.id) ? 'bg-indigo-50' : ''}`}
                    onClick={() => navigate(`/assets/${a.id}`)}>
                    {isManager && (
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} className="rounded" />
                      </td>
                    )}
                    <td className="font-mono text-xs text-gray-500">{a.assetTag}</td>
                    <td className="font-medium">{a.name}</td>
                    <td className="text-gray-500">{a.category?.name || '-'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {isManager
                        ? <select
                            value={a.status}
                            onChange={e => handleStatusChange(a.id, e.target.value)}
                            className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                              a.status === 'IN_STOCK' ? 'bg-green-100 text-green-800' :
                              a.status === 'IN_USE' ? 'bg-blue-100 text-blue-800' :
                              a.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        : <span className={STATUS_BADGE[a.status] || 'badge-gray'}>{STATUS_LABEL[a.status]}</span>
                      }
                    </td>
                    <td className="text-gray-600">{a.custodian?.name || '-'}</td>
                    <td className="text-gray-600">{a.location?.name || '-'}</td>
                    <td className="text-gray-600">{a.purchaseAmount ? `$${a.purchaseAmount.toLocaleString()}` : '-'}</td>
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
                <button key={p} onClick={() => { setPage(p); load(p) }}
                  className={`px-3 py-1 text-xs rounded ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="新增資產" onClose={() => setShowForm(false)} size="lg">
          <AssetForm onSave={() => { setShowForm(false); load(page) }} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {showManager && (
        <Modal title="分類／地點管理" onClose={() => setShowManager(false)}>
          <CategoryLocationManager onClose={() => setShowManager(false)} />
        </Modal>
      )}

      {showBatchQR && selectedAssets.length > 0 && (
        <BatchQRModal assets={selectedAssets} onClose={() => setShowBatchQR(false)} />
      )}
    </div>
  )
}
