import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'

const ROLES = ['ADMIN', 'MANAGER', 'USER']

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try { setUsers(await api.users.list()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }))
  const setE = f => e => setEditForm(v => ({ ...v, [f]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.users.create(form)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'USER' })
      load()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const data = { name: editForm.name, email: editForm.email, role: editForm.role }
      if (editForm.password) data.password = editForm.password
      await api.users.update(showEdit.id, data)
      setShowEdit(null)
      load()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(user) {
    if (!confirm(`確定要${user.isActive ? '停用' : '啟用'}「${user.name}」？`)) return
    try {
      user.isActive
        ? await api.users.delete(user.id)
        : await api.users.update(user.id, { isActive: true })
      load()
    } catch (err) { alert(err.message) }
  }

  function openEdit(u) {
    setError('')
    setEditForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive })
    setShowEdit(u)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">使用者管理</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">＋ 新增使用者</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr><th>姓名</th><th>Email</th><th>角色</th><th>狀態</th><th>建立時間</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">載入中...</td></tr>
              : users.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}{u.id === me?.id && <span className="ml-1 text-xs text-indigo-400">(我)</span>}</td>
                  <td className="text-gray-500">{u.email}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : u.role === 'MANAGER' ? 'badge-blue' : 'badge-gray'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>{u.isActive ? '啟用' : '停用'}</span></td>
                  <td className="text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('zh-TW')}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="btn-sm btn-secondary">編輯</button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleToggle(u)} className={`btn-sm ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}>
                          {u.isActive ? '停用' : '啟用'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* 新增使用者 */}
      {showForm && (
        <Modal title="新增使用者" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <div><label className="label">姓名 *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
            <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={set('email')} required /></div>
            <div><label className="label">密碼 *</label><input type="password" className="input" value={form.password} onChange={set('password')} required minLength={6} /></div>
            <div>
              <label className="label">角色</label>
              <select className="select" value={form.role} onChange={set('role')}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '新增中...' : '新增'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 編輯使用者 */}
      {showEdit && (
        <Modal title={`編輯：${showEdit.name}`} onClose={() => setShowEdit(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <div><label className="label">姓名 *</label><input className="input" value={editForm.name} onChange={setE('name')} required /></div>
            <div><label className="label">Email *</label><input type="email" className="input" value={editForm.email} onChange={setE('email')} required /></div>
            <div>
              <label className="label">新密碼（留空則不修改）</label>
              <input type="password" className="input" value={editForm.password} onChange={setE('password')} minLength={6} placeholder="輸入新密碼..." />
            </div>
            <div>
              <label className="label">角色</label>
              <select className="select" value={editForm.role} onChange={setE('role')}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
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
