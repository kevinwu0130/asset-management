import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: '在庫' },
  { value: 'IN_USE', label: '使用中' },
  { value: 'MAINTENANCE', label: '維修中' },
  { value: 'RETIRED', label: '報廢' }
]

export default function AssetForm({ asset, onSave, onCancel }) {
  const [form, setForm] = useState({
    assetTag: '', name: '', description: '', categoryId: '', status: 'IN_STOCK',
    purchaseDate: '', purchaseAmount: '', custodianId: '', locationId: '',
    barcode: '', warrantyExpiry: '', notes: '',
    ...asset,
    purchaseDate: asset?.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
    warrantyExpiry: asset?.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
    categoryId: asset?.categoryId || '',
    locationId: asset?.locationId || '',
    custodianId: asset?.custodianId || ''
  })
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.categories.list(), api.locations.list(), api.users.list()])
      .then(([cats, locs, usrs]) => { setCategories(cats); setLocations(locs); setUsers(usrs) })
      .catch(() => {})
  }, [])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        locationId: form.locationId || null,
        custodianId: form.custodianId || null,
        purchaseAmount: form.purchaseAmount ? parseFloat(form.purchaseAmount) : null
      }
      const result = asset?.id
        ? await api.assets.update(asset.id, payload)
        : await api.assets.create(payload)
      onSave(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">資產編號 *</label>
          <input className="input" value={form.assetTag} onChange={set('assetTag')} required />
        </div>
        <div>
          <label className="label">資產名稱 *</label>
          <input className="input" value={form.name} onChange={set('name')} required />
        </div>
      </div>

      <div>
        <label className="label">說明</label>
        <input className="input" value={form.description} onChange={set('description')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">分類</label>
          <select className="select" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">請選擇</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">狀態</label>
          <select className="select" value={form.status} onChange={set('status')}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">保管人</label>
          <select className="select" value={form.custodianId} onChange={set('custodianId')}>
            <option value="">請選擇</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">存放地點</label>
          <select className="select" value={form.locationId} onChange={set('locationId')}>
            <option value="">請選擇</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">購買日期</label>
          <input type="date" className="input" value={form.purchaseDate} onChange={set('purchaseDate')} />
        </div>
        <div>
          <label className="label">購買金額</label>
          <input type="number" className="input" value={form.purchaseAmount} onChange={set('purchaseAmount')} min="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">條碼</label>
          <input className="input" value={form.barcode} onChange={set('barcode')} />
        </div>
        <div>
          <label className="label">保固到期日</label>
          <input type="date" className="input" value={form.warrantyExpiry} onChange={set('warrantyExpiry')} />
        </div>
      </div>

      <div>
        <label className="label">備註</label>
        <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">取消</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? '儲存中...' : asset?.id ? '更新' : '新增'}
        </button>
      </div>
    </form>
  )
}
