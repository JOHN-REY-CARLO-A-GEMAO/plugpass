'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, AlertTriangle, ShieldCheck, BarChart3, TrendingUp, Users, FileText, ArrowRight, AlertCircle } from 'lucide-react'

interface AuditData {
  total: number
  avgRiskScore: number
  medianRiskScore: number
  riskBreakdown: { low: number; medium: number; high: number; critical: number }
  categoryBreakdown: { name: string; count: number; avgScore: number }[]
  developerBreakdown: { name: string; count: number; avgScore: number; trustBadge: string }[]
  criticalOutliers: { id: string; name: string; riskScore: number; riskLevel: string; permissionCount: number; developerName: string }[]
  permissionStats: { total: number; avgPerExtension: number; mostCommon: { name: string; count: number }[] }
  alternativeCoverage: number
}

const riskColors: Record<string, string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-900/40 text-red-300 border-red-800/50',
}

const riskBarColors: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
  critical: 'bg-red-700',
}

function getScoreColor(score: number): string {
  if (score < 25) return '#22c55e'
  if (score < 50) return '#f59e0b'
  if (score < 70) return '#ef4444'
  return '#991b1b'
}

function getScoreLabel(score: number): string {
  if (score < 25) return 'Low'
  if (score < 50) return 'Medium'
  if (score < 70) return 'High'
  return 'Critical'
}

export default function AuditPage() {
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audit')
      .then(res => res.json())
      .then(data => {
        setAudit(data)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-500">Loading audit report...</div>
        </div>
      </main>
    )
  }

  if (!audit || audit.total === 0) {
    return (
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-2">Batch Audit Report</h1>
          <p className="text-gray-400 mb-8">Portfolio-wide security analysis of all scanned extensions</p>
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No extensions scanned yet</p>
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">
              Go to Dashboard to scan extensions →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const healthScore = Math.max(0, 100 - audit.avgRiskScore)
  const healthColor = getScoreColor(100 - healthScore)
  const healthLabel = getScoreLabel(100 - healthScore)

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Batch Audit Report</h1>
          <p className="text-gray-400">Portfolio-wide security analysis of {audit.total} extension{audit.total !== 1 ? 's' : ''}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-500">Portfolio Health</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: healthColor }}>{healthScore}</div>
            <div className="text-xs text-gray-500">/100 ({healthLabel} Risk)</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-500">Avg Risk Score</span>
            </div>
            <div className="text-2xl font-bold text-gray-200">{audit.avgRiskScore}</div>
            <div className="text-xs text-gray-500">Median: {audit.medianRiskScore}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-500">High/Critical</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{audit.riskBreakdown.high + audit.riskBreakdown.critical}</div>
            <div className="text-xs text-gray-500">of {audit.total} extensions</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-500">Avg Permissions</span>
            </div>
            <div className="text-2xl font-bold text-gray-200">{audit.permissionStats.avgPerExtension}</div>
            <div className="text-xs text-gray-500">per extension</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Risk Distribution
            </h2>
            <div className="space-y-3">
              {(['low', 'medium', 'high', 'critical'] as const).map(level => {
                const count = audit.riskBreakdown[level]
                const pct = audit.total > 0 ? Math.round((count / audit.total) * 100) : 0
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border capitalize ${riskColors[level]}`}>
                        {level}
                      </span>
                      <span className="text-sm text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${riskBarColors[level]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Category Breakdown
            </h2>
            <div className="space-y-3">
              {audit.categoryBreakdown.map(cat => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">{cat.name}</span>
                    <span className="text-xs text-gray-600">({cat.count})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${cat.avgScore}%`, backgroundColor: getScoreColor(cat.avgScore) }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{cat.avgScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Critical Outliers
            </h2>
            {audit.criticalOutliers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No high or critical risk extensions found</p>
            ) : (
              <div className="space-y-2">
                {audit.criticalOutliers.map(ext => (
                  <Link
                    key={ext.id}
                    href={`/extensions/${ext.id}`}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ext.name}</div>
                      <div className="text-xs text-gray-500">{ext.developerName} · {ext.permissionCount} permissions</div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded border ${riskColors[ext.riskLevel]}`}>
                        {ext.riskScore}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Developer Risk Ranking
            </h2>
            <div className="space-y-2">
              {audit.developerBreakdown.slice(0, 8).map(dev => (
                <div key={dev.name} className="flex items-center justify-between p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">{dev.name}</div>
                    <div className="text-xs text-gray-600">{dev.count} extension{dev.count !== 1 ? 's' : ''} · {dev.trustBadge !== 'none' ? dev.trustBadge : 'unverified'}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${dev.avgScore}%`, backgroundColor: getScoreColor(dev.avgScore) }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right">{dev.avgScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Most Common Permissions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {audit.permissionStats.mostCommon.map(perm => (
              <div key={perm.name} className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-sm font-mono text-emerald-400 truncate">{perm.name}</div>
                <div className="text-xs text-gray-500 mt-1">Used by {perm.count} extension{perm.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
            <span>Total permissions across all extensions: {audit.permissionStats.total}</span>
            <span>Alternative coverage: {audit.alternativeCoverage}%</span>
          </div>
        </div>
      </div>
    </main>
  )
}
