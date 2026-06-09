import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import AssetForm from '../components/AssetForm'

const STATUS_LABEL = { IN_STOCK: '在庫', IN_USE: '使用中', MAINTENANCE: '維修中', RETIRED: '報廢' }
const STATUS_BADGE = { IN_STOCK: 'badge-green', IN_USE: 'badge-blue', MAINTENANCE: 'badge-yellow', RETIRED: 'badge-gray' }
const MAINT_STATUS = { PENDING: '待送修', IN_REPAIR: '維修中', COMPLETED: '已完成', CANCELLED: '已取消' }
const MAINT_BADGE  = { PENDING: 'bg-yellow-100 text-yellow-800', IN_REPAIR: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-gray-100 text-gray-600' }

// 直線折舊計算（預設 5 年）
function calcDepreciation(purchaseAmount, purchaseDate, lifeYears = 5) {
  if (!purchaseAmount || !purchaseDate) return null
  const years = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
  const remaining = Math.max(0, 1 - years / lifeYears)
  return {
    currentValue: Math.round(purchaseAmount * remaining),
    percent: Math.round(remaining * 100),
    years: years.toFixed(1),
    lifeYears
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function MaintenanceSection({ assetId, isManager, isAdmin }) {
  const [records, setRecords] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [form, setForm] = useState({ vendor: '', description: '', sentAt: '', expectedReturnAt: '', notes: '' })
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await api.maintenance.listByAsset(assetId).catch(() => [])
    setRecords(data)
  }
  useEffect(() => { load() }, [assetId])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.maintenance.create({ assetId, ...form })
      setShowForm(false)
      setForm({ vendor: '', description: '', sentAt: '', expectedReturnAt: '', notes: '' })
      load()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.maintenance.update(showEdit.id, editForm)
      setShowEdit(null)
      load()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此維修記錄？')) return
    await api.maintenance.delete(id)
    load()
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">維修記錄</h2>
        {isManager && <button onClick={() => setShowForm(true)} className="btn-primary text-xs py-1 px-3">＋ 新增送修</button>}
      </div>

      {records.length === 0
        ? <p className="text-sm text-gray-400">尚無維修記錄</p>
        : <div className="space-y-3">
            {records.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${MAINT_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>{MAINT_STATUS[r.status]}</span>
                    {r.vendor && <span className="font-medium text-gray-700">{r.vendor}</span>}
                  </div>
                  {isManager && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setShowEdit(r); setEditForm({ status: r.status, vendor: r.vendor || '', description: r.description || '', cost: r.cost || '', sentAt: r.sentAt?.slice(0,10) || '', expectedReturnAt: r.expectedReturnAt?.slice(0,10) || '', returnedAt: r.returnedAt?.slice(0,10) || '', notes: r.notes || '' }) }} className="text-xs text-indigo-600 hover:underline">編輯</button>
                      {isAdmin && <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">刪除</button>}
                    </div>
                  )}
                </div>
                {r.description && <p className="text-gray-600 mt-1">{r.description}</p>}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                  {r.sentAt && <span>送修：{new Date(r.sentAt).toLocaleDateString('zh-TW')}</span>}
                  {r.expectedReturnAt && <span>預計取回：{new Date(r.expectedReturnAt).toLocaleDateString('zh-TW')}</span>}
                  {r.returnedAt && <span className="text-green-600">實際取回：{new Date(r.returnedAt).toLocaleDateString('zh-TW')}</span>}
                  {r.cost != null && <span className="text-orange-600 font-medium">費用：${Number(r.cost).toLocaleString()}</span>}
                  <span>建立者：{r.createdBy?.name}</span>
                </div>
                {r.notes && <p className="text-xs text-gray-400 mt-1">備註：{r.notes}</p>}
              </div>
            ))}
          </div>
      }

      {showForm && (
        <Modal title="新增送修記錄" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div><label className="label">維修廠商</label><input className="input" value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} /></div>
            <div><label className="label">問題說明</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">送修日期</label><input type="date" className="input" value={form.sentAt} onChange={e => setForm(f => ({...f, sentAt: e.target.value}))} /></div>
              <div><label className="label">預計取回日</label><input type="date" className="input" value={form.expectedReturnAt} onChange={e => setForm(f => ({...f, expectedReturnAt: e.target.value}))} /></div>
            </div>
            <div><label className="label">備註</label><input className="input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title="更新維修記錄" onClose={() => setShowEdit(null)}>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className="label">狀態</label>
              <select className="select" value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}>
                {Object.entries(MAINT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="label">維修廠商</label><input className="input" value={editForm.vendor} onChange={e => setEditForm(f => ({...f, vendor: e.target.value}))} /></div>
            <div><label className="label">問題說明</label><textarea className="input" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">送修日期</label><input type="date" className="input" value={editForm.sentAt} onChange={e => setEditForm(f => ({...f, sentAt: e.target.value}))} /></div>
              <div><label className="label">預計取回日</label><input type="date" className="input" value={editForm.expectedReturnAt} onChange={e => setEditForm(f => ({...f, expectedReturnAt: e.target.value}))} /></div>
            </div>
            <div><label className="label">實際取回日</label><input type="date" className="input" value={editForm.returnedAt} onChange={e => setEditForm(f => ({...f, returnedAt: e.target.value}))} /></div>
            <div><label className="label">維修費用</label><input type="number" className="input" value={editForm.cost} onChange={e => setEditForm(f => ({...f, cost: e.target.value}))} min="0" /></div>
            <div><label className="label">備註</label><input className="input" value={editForm.notes} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">取消</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function AttachmentsSection({ assetId, isManager }) {
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function load() {
    const data = await api.attachments.listByAsset(assetId).catch(() => [])
    setAttachments(data)
  }
  useEffect(() => { load() }, [assetId])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await api.attachments.upload(assetId, file)
      load()
    } catch (err) { alert(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除此附件？')) return
    await api.attachments.delete(id)
    load()
  }

  function getIcon(mimetype) {
    if (mimetype?.startsWith('image/')) return '🖼'
    if (mimetype === 'application/pdf') return '📄'
    if (mimetype?.includes('spreadsheet') || mimetype?.includes('excel')) return '📊'
    if (mimetype?.includes('word')) return '📝'
    return '📎'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">附件</h2>
        {isManager && (
          <>
            <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-secondary text-xs py-1 px-3">
              {uploading ? '上傳中...' : '＋ 上傳附件'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          </>
        )}
      </div>

      {attachments.length === 0
        ? <p className="text-sm text-gray-400">尚無附件</p>
        : <div className="space-y-2">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{getIcon(att.mimetype)}</span>
                  <div className="min-w-0">
                    <a href={api.attachments.url(att.filename)} target="_blank" rel="noreferrer"
                       className="text-sm text-indigo-600 hover:underline truncate block">{att.originalName}</a>
                    <p className="text-xs text-gray-400">{formatBytes(att.size)} · {att.uploadedBy?.name} · {new Date(att.createdAt).toLocaleDateString('zh-TW')}</p>
                  </div>
                </div>
                {isManager && (
                  <button onClick={() => handleDelete(att.id)} className="text-xs text-red-500 hover:underline shrink-0 ml-2">刪除</button>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  )
}

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isManager, isAdmin } = useAuth()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showLoan, setShowLoan] = useState(false)
  const [loanForm, setLoanForm] = useState({ expectedReturnAt: '', notes: '' })
  const [loanSaving, setLoanSaving] = useState(false)
  const printRef = useRef()

  async function load() {
    setLoading(true)
    try { setAsset(await api.assets.get(parseInt(id))) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function handleDelete() {
    if (!confirm('確定要報廢此資產？')) return
    await api.assets.delete(parseInt(id))
    navigate('/assets')
  }

  async function handleLoan(e) {
    e.preventDefault()
    setLoanSaving(true)
    try { await api.loans.create({ assetId: parseInt(id), ...loanForm }); setShowLoan(false); load() }
    catch (err) { alert(err.message) }
    finally { setLoanSaving(false) }
  }

  function handlePrintQR() {
    const w = window.open('', '_blank', 'width=400,height=400')
    w.document.write(`
      <html><head><title>QR Code - ${asset.assetTag}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;gap:12px}
      h2{font-size:16px;margin:0} p{font-size:12px;color:#666;margin:0}</style></head>
      <body>
        ${printRef.current?.innerHTML}
        <h2>${asset.name}</h2>
        <p>${asset.assetTag}</p>
        <script>window.onload=()=>window.print()</script>
      </body></html>`)
    w.document.close()
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!asset) return <div className="text-center py-20 text-gray-400">找不到資產</div>

  const qrValue = `${window.location.origin}/assets/${asset.id}`
  const depr = calcDepreciation(asset.purchaseAmount, asset.purchaseDate)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/assets')} className="text-sm text-indigo-600 hover:underline mb-2">← 返回列表</button>
          <h1 className="text-xl font-bold text-gray-900">{asset.name}</h1>
          <span className="font-mono text-sm text-gray-400">{asset.assetTag}</span>
          <span className={`ml-3 ${STATUS_BADGE[asset.status] || 'badge-gray'}`}>{STATUS_LABEL[asset.status]}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => setShowQR(true)} className="btn-secondary">QR Code</button>
          {asset.status === 'IN_STOCK' && <button onClick={() => setShowLoan(true)} className="btn-secondary">申請借用</button>}
          {isManager && <button onClick={() => setShowEdit(true)} className="btn-primary">編輯</button>}
          {isAdmin && <button onClick={handleDelete} className="btn-danger btn-sm">報廢</button>}
        </div>
      </div>

      {/* Info */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">基本資訊</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            ['分類', asset.category?.name],
            ['保管人', asset.custodian?.name],
            ['存放地點', asset.location?.name],
            ['購買日期', asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('zh-TW') : null],
            ['購買金額', asset.purchaseAmount ? `$${asset.purchaseAmount.toLocaleString()}` : null],
            ['保固到期', asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString('zh-TW') : null],
            ['條碼', asset.barcode],
            ['建立者', asset.createdBy?.name],
            ['建立時間', new Date(asset.createdAt).toLocaleDateString('zh-TW')],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-800 mt-0.5">{val || '-'}</p>
            </div>
          ))}
        </div>
        {asset.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">備註</p>
            <p className="text-sm text-gray-700 mt-1">{asset.notes}</p>
          </div>
        )}
      </div>

      {/* 折舊計算 */}
      {depr && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">資產折舊（直線法 {depr.lifeYears} 年）</h2>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <p className="text-xs text-gray-400">購買金額</p>
              <p className="font-semibold text-gray-800">${asset.purchaseAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">帳面價值</p>
              <p className="font-semibold text-indigo-600">${depr.currentValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">使用年數</p>
              <p className="font-semibold text-gray-800">{depr.years} 年</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${depr.percent > 30 ? 'bg-indigo-500' : depr.percent > 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                   style={{ width: `${depr.percent}%` }} />
            </div>
            <span className="text-sm font-medium text-gray-700 w-12 text-right">{depr.percent}%</span>
          </div>
          {depr.percent === 0 && <p className="text-xs text-red-500 mt-2">此資產已超過預估使用年限</p>}
        </div>
      )}

      {/* 維修記錄 */}
      <MaintenanceSection assetId={parseInt(id)} isManager={isManager} isAdmin={isAdmin} />

      {/* 附件 */}
      <AttachmentsSection assetId={parseInt(id)} isManager={isManager} />

      {/* 變動履歷 */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">變動履歷</h2>
        {asset.logs.length === 0
          ? <p className="text-sm text-gray-400">尚無紀錄</p>
          : <div className="space-y-1">
              {asset.logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('zh-TW')}</span>
                  <span className="font-medium text-indigo-700 whitespace-nowrap">{log.action}</span>
                  <span className="text-gray-500 whitespace-nowrap">{log.user?.name}</span>
                  {log.field && <span className="text-gray-600">{log.field}: {log.fromValue} → {log.toValue}</span>}
                  {!log.field && log.notes && <span className="text-gray-500">{log.notes}</span>}
                </div>
              ))}
            </div>
        }
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <Modal title="資產 QR Code" onClose={() => setShowQR(false)} size="sm">
          <div className="flex flex-col items-center gap-4 py-2">
            <div ref={printRef} className="p-4 bg-white border border-gray-200 rounded-lg">
              <QRCodeSVG value={qrValue} size={180} includeMargin />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">{asset.name}</p>
              <p className="text-sm text-gray-500 font-mono">{asset.assetTag}</p>
              <p className="text-xs text-gray-400 mt-1 break-all">{qrValue}</p>
            </div>
            <button onClick={handlePrintQR} className="btn-primary w-full">🖨 列印 QR Code</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="編輯資產" onClose={() => setShowEdit(false)} size="lg">
          <AssetForm asset={asset} onSave={() => { setShowEdit(false); load() }} onCancel={() => setShowEdit(false)} />
        </Modal>
      )}

      {/* Loan Modal */}
      {showLoan && (
        <Modal title="申請借用" onClose={() => setShowLoan(false)}>
          <form onSubmit={handleLoan} className="space-y-4">
            <div>
              <label className="label">預計歸還日期</label>
              <input type="date" className="input" value={loanForm.expectedReturnAt} onChange={e => setLoanForm(f => ({ ...f, expectedReturnAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">備註</label>
              <textarea className="input" rows={3} value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowLoan(false)} className="btn-secondary">取消</button>
              <button type="submit" disabled={loanSaving} className="btn-primary">{loanSaving ? '送出中...' : '送出申請'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
