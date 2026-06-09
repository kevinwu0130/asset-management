import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { api } from '../lib/api'

export default function ScanPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('text') // 'text' | 'camera'
  const [input, setInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (mode === 'text') inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    if (mode !== 'camera') return

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      false
    )

    scanner.render(
      (decodedText) => {
        scanner.clear()
        handleScanResult(decodedText)
      },
      (err) => {}
    )

    scannerRef.current = scanner
    setScannerReady(true)

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [mode])

  async function handleScanResult(value) {
    setError('')
    setSearching(true)
    try {
      // Value can be: full URL like /assets/123, or just the assetTag/barcode
      let query = value.trim()
      const urlMatch = query.match(/\/assets\/(\d+)$/)
      if (urlMatch) {
        navigate(`/assets/${urlMatch[1]}`)
        return
      }
      // Search by assetTag or barcode
      const result = await api.assets.list({ search: query, limit: 5 })
      if (result.data?.length === 1) {
        navigate(`/assets/${result.data[0].id}`)
      } else if (result.data?.length > 1) {
        setError(`找到 ${result.data.length} 筆結果，請輸入更精確的資產編號`)
        setSearching(false)
      } else {
        setError(`找不到資產：${query}`)
        setSearching(false)
      }
    } catch (err) {
      setError(err.message)
      setSearching(false)
    }
  }

  async function handleTextSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    await handleScanResult(input)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">掃碼盤點</h1>

      {/* Mode Switch */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button onClick={() => setMode('text')} className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'text' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          ⌨ 輸入 / 掃描槍
        </button>
        <button onClick={() => setMode('camera')} className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'camera' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          📷 相機掃描
        </button>
      </div>

      {mode === 'text' && (
        <div className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">輸入資產編號或條碼</h2>
            <p className="text-xs text-gray-400">支援手持掃描槍或手動輸入。掃描 QR Code 後自動跳轉。</p>
          </div>
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              className="input flex-1 text-base"
              placeholder="資產編號、條碼..."
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              autoFocus
            />
            <button type="submit" disabled={searching || !input.trim()} className="btn-primary px-5">
              {searching ? '搜尋中...' : '查詢'}
            </button>
          </form>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <p className="text-xs text-gray-400">提示：使用掃描槍掃 QR Code 後會自動提交並跳轉到資產頁面</p>
        </div>
      )}

      {mode === 'camera' && (
        <div className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">相機掃描 QR Code</h2>
            <p className="text-xs text-gray-400">請允許相機存取權限，對準 QR Code 進行掃描</p>
          </div>
          {searching
            ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            : <div id="qr-reader" className="w-full" />
          }
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
      )}

      <div className="card bg-blue-50 border-blue-100">
        <h3 className="text-sm font-semibold text-blue-700 mb-2">使用說明</h3>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>• 掃描槍模式：使用 USB/藍牙掃描槍掃描資產 QR Code 或條碼</li>
          <li>• 相機模式：使用手機或電腦相機對準 QR Code</li>
          <li>• 找到資產後，可立即更新狀態或確認保管人</li>
          <li>• 支援直接輸入資產編號（如 AST-00001）</li>
        </ul>
      </div>
    </div>
  )
}
