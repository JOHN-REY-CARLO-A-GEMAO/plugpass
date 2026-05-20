'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Search, RefreshCw } from 'lucide-react'

interface Extension {
  id: string
  chromeId: string
  name: string
  description: string
  iconUrl: string | null
  riskScore: number
  riskLevel: string
  developerName: string
  permissionCount: number
  sensitivePermissionCount: number
}

const riskColors: Record<string, string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-900/40 text-red-300 border-red-800/50',
  unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export default function Dashboard() {
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [scanId, setScanId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; name?: string; score?: number; details?: string } | null>(null)

  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (filter) params.set('riskLevel', filter)

        const res = await fetch(`/api/extensions?${params}`)
        if (!res.ok) {
          console.error('Failed to fetch extensions:', res.status)
          return
        }
        const data = await res.json()
        setExtensions(data)
      } catch (err) {
        console.error('Error fetching extensions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchExtensions()
  }, [search, filter])

  const handleScan = async () => {
    if (!scanId.trim()) return
    setScanning(true)
    setScanResult(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chromeId: scanId.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setScanResult({
          success: true,
          message: data.message || 'Extension scanned successfully',
          name: data.extension?.name,
          score: data.extension?.riskScore,
        })
        setScanId('')

        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (filter) params.set('riskLevel', filter)
        const refetch = await fetch(`/api/extensions?${params}`)
        const refreshed = await refetch.json()
        setExtensions(refreshed)
      } else {
        setScanResult({
          success: false,
          message: data.error || 'Scan failed',
        })
      }
    } catch (err: any) {
      console.error('Scan error:', err)
      setScanResult({
        success: false,
        message: err?.message || 'Network error. Is the dev server running?',
      })
    } finally {
      setScanning(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scanId.trim() && !scanning) {
      handleScan()
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setScanResult(null)

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        const details = []
        if (data.removed > 0) details.push(`${data.removed} removed`)
        if (data.added > 0) details.push(`${data.added} added`)
        if (data.updated > 0) details.push(`${data.updated} updated`)

        setScanResult({
          success: true,
          message: data.message,
          details: details.length > 0 ? details.join(', ') : 'No changes needed',
        })

        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (filter) params.set('riskLevel', filter)
        const refetch = await fetch(`/api/extensions?${params}`)
        const refreshed = await refetch.json()
        setExtensions(refreshed)
      } else {
        setScanResult({
          success: false,
          message: data.error || 'Sync failed',
        })
      }
    } catch (err: any) {
      console.error('Sync error:', err)
      setScanResult({
        success: false,
        message: err?.message || 'Network error. Is the dev server running?',
      })
    } finally {
      setSyncing(false)
    }
  }

  const stats = {
    total: extensions.length,
    critical: extensions.filter(e => e.riskLevel === 'critical').length,
    high: extensions.filter(e => e.riskLevel === 'high').length,
    safe: extensions.filter(e => e.riskLevel === 'low').length,
  }

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Plugin Trust Registry</h1>
          <p className="text-gray-400">Scan, score, and verify AI extensions before installation</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Scanned</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-sm text-gray-500">Critical Risk</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">{stats.high}</div>
            <div className="text-sm text-gray-500">High Risk</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.safe}</div>
            <div className="text-sm text-gray-500">Low Risk</div>
          </div>
        </div>

        {scanResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            scanResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {scanResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${scanResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {scanResult.message}
                </p>
                {scanResult.name && scanResult.score !== undefined && (
                  <p className="text-xs text-gray-400 mt-1">
                    {scanResult.name} — Risk Score: {scanResult.score}/100
                  </p>
                )}
                {scanResult.details && (
                  <p className="text-xs text-gray-400 mt-1">
                    {scanResult.details}
                  </p>
                )}
              </div>
              <button
                onClick={() => setScanResult(null)}
                className="text-gray-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search extensions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 border border-gray-700"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync Local
              </>
            )}
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Chrome extension ID"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 w-48"
            />
            <button
              onClick={handleScan}
              disabled={scanning || !scanId.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                'Scan'
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading extensions...</div>
        ) : extensions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No extensions found</p>
            <p className="text-sm text-gray-600">Enter a Chrome extension ID above to scan it</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Extension</th>
                  <th className="px-4 py-3">Risk Score</th>
                  <th className="px-4 py-3">Developer</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {extensions.map((ext) => (
                  <tr key={ext.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {ext.iconUrl && (
                          <img src={ext.iconUrl} alt="" className="w-8 h-8 rounded" />
                        )}
                        <div>
                          <div className="font-medium">{ext.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{ext.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${ext.riskScore}%`,
                              backgroundColor: ext.riskScore < 25 ? '#22c55e' : ext.riskScore < 50 ? '#f59e0b' : ext.riskScore < 70 ? '#ef4444' : '#991b1b'
                            }}
                          />
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded border ${riskColors[ext.riskLevel]}`}>
                          {ext.riskScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{ext.developerName}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <span className="text-gray-400">{ext.permissionCount}</span>
                        {ext.sensitivePermissionCount > 0 && (
                          <span className="text-red-400 ml-1">+{ext.sensitivePermissionCount} sensitive</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/extensions/${ext.id}`}
                        className="text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
