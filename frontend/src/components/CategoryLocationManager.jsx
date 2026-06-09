import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function ListManager({ title, items, onAdd, onDelete, isAdmin }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try { await onAdd(name.trim()); setName('') }
    catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {items.length === 0
          ? <p className="text-xs text-gray-400">尚無資料</p>
          : items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm">{item.name}</span>
              {isAdmin && (
                <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-600 text-xs">刪除</button>
              )}
            </div>
          ))
        }
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input className="input flex-1 text-sm" placeholder={`新增${title}`} value={name} onChange={e => setName(e.target.value)} />
        <button type="submit" disabled={saving} className="btn-primary text-xs px-3">{saving ? '...' : '新增'}</button>
      </form>
    </div>
  )
}

export default function CategoryLocationManager({ onClose }) {
  const [tab, setTab] = useState('category')
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const isAdmin = true // controlled by parent if needed

  async function load() {
    const [cats, locs] = await Promise.all([api.categories.list(), api.locations.list()])
    setCategories(cats)
    setLocations(locs)
  }

  useEffect(() => { load() }, [])

  async function addCategory(name) { await api.categories.create({ name }); load() }
  async function addLocation(name) { await api.locations.create({ name }); load() }
  async function deleteCategory(id) { if (confirm('確定刪除？')) { await api.categories.delete(id); load() } }
  async function deleteLocation(id) { if (confirm('確定刪除？')) { await api.locations.delete(id); load() } }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('category')} className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === 'category' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>分類管理</button>
        <button onClick={() => setTab('location')} className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === 'location' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>地點管理</button>
      </div>
      {tab === 'category'
        ? <ListManager title="資產分類" items={categories} onAdd={addCategory} onDelete={deleteCategory} isAdmin={isAdmin} />
        : <ListManager title="存放地點" items={locations} onAdd={addLocation} onDelete={deleteLocation} isAdmin={isAdmin} />
      }
    </div>
  )
}
