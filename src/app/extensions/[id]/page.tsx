'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, AlertTriangle, CheckCircle, XCircle, ArrowRight, Code, User, Globe, Mail, Lightbulb, ThumbsUp, Info } from 'lucide-react'

interface Recommendation {
  type: 'warning' | 'info' | 'positive'
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  actionable: boolean
  action?: string
}

interface ExtensionDetail {
  id: string
  chromeId: string
  name: string
  version: string
  description: string
  iconUrl: string | null
  storeUrl: string
  privacyPolicyUrl: string | null
  riskScore: number
  riskLevel: string
  developer: {
    name: string
    trustBadge: string
    verificationLevel: string
    githubUrl: string | null
    linkedinUrl: string | null
  }
  permissions: {
    name: string
    category: string
    sensitivity: string
    description: string | null
  }[]
  dataPathways: {
    apiEndpoint: string
    dataType: string
    direction: string
    policyClaim: string | null
    actualBehavior: string | null
    policyDelta: number
  }[]
  alternatives: {
    alternative: {
      id: string
      name: string
      riskScore: number
      riskLevel: string
    }
    reason: string
    permissionDelta: number
  }[]
  riskFactors: string[]
  recommendations: Recommendation[]
}

const sensitivityColors: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

const recommendationIcons: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  positive: <ThumbsUp className="w-5 h-5 text-emerald-400" />,
}

const recommendationBorders: Record<string, string> = {
  warning: 'border-l-amber-500/50 bg-amber-500/5',
  info: 'border-l-blue-500/50 bg-blue-500/5',
  positive: 'border-l-emerald-500/50 bg-emerald-500/5',
}

export default function ExtensionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [extension, setExtension] = useState<ExtensionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    const fetchDetail = async () => {
      const res = await fetch(`/api/extensions/${id}`)
      const data = await res.json()
      setExtension(data)
      setLoading(false)
    }
    fetchDetail()
  }, [id])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
  }

  if (!extension) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Extension not found</div>
  }

  const warnings = extension.recommendations?.filter(r => r.type === 'warning') || []
  const positives = extension.recommendations?.filter(r => r.type === 'positive') || []
  const infos = extension.recommendations?.filter(r => r.type === 'info') || []

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-white mb-6 inline-block">
          &larr; Back to Dashboard
        </Link>

        <div className="flex items-start gap-6 mb-8">
          {extension.iconUrl && <img src={extension.iconUrl} alt="" className="w-16 h-16 rounded-lg" />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">{extension.name}</h1>
            <p className="text-gray-400 text-sm mb-2">{extension.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>v{extension.version}</span>
              <a href={extension.storeUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                Chrome Web Store
              </a>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{
              color: extension.riskScore < 25 ? '#22c55e' : extension.riskScore < 50 ? '#f59e0b' : extension.riskScore < 70 ? '#ef4444' : '#991b1b'
            }}>
              {extension.riskScore}
            </div>
            <div className="text-sm text-gray-500">Risk Score</div>
          </div>
        </div>

        {extension.recommendations && extension.recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              Recommendations
            </h2>

            {warnings.length > 0 && (
              <div className="space-y-3 mb-4">
                {warnings.map((rec, i) => (
                  <div key={i} className={`border-l-4 rounded-r-lg p-4 ${recommendationBorders[rec.type]}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-amber-300">{rec.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            rec.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            rec.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {rec.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{rec.description}</p>
                        {rec.actionable && rec.action && (
                          <div className="flex items-start gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded px-3 py-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{rec.action}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {infos.length > 0 && (
              <div className="space-y-3 mb-4">
                {infos.map((rec, i) => (
                  <div key={i} className={`border-l-4 rounded-r-lg p-4 ${recommendationBorders[rec.type]}`}>
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-blue-300">{rec.title}</span>
                        <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {positives.length > 0 && (
              <div className="space-y-3">
                {positives.map((rec, i) => (
                  <div key={i} className={`border-l-4 rounded-r-lg p-4 ${recommendationBorders[rec.type]}`}>
                    <div className="flex items-start gap-3">
                      <ThumbsUp className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-emerald-300">{rec.title}</span>
                        <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissions ({extension.permissions.length})
              </h2>
              <div className="space-y-2">
                {extension.permissions.map((perm, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{perm.name}</div>
                      <div className="text-xs text-gray-500">{perm.description}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded border ${sensitivityColors[perm.sensitivity]}`}>
                      {perm.sensitivity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {extension.dataPathways.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  Data Pathways
                </h2>
                <div className="space-y-3">
                  {extension.dataPathways.map((dp, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono text-emerald-400">{dp.apiEndpoint}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${dp.policyDelta > 20 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                          Delta: {dp.policyDelta}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Data Type:</span> {dp.dataType}
                        </div>
                        <div>
                          <span className="text-gray-500">Direction:</span> {dp.direction}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Developer</h2>
              <div className="space-y-3">
                <div className="text-sm font-medium">{extension.developer.name}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded border ${
                    extension.developer.trustBadge === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    extension.developer.trustBadge === 'partial' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-gray-700 text-gray-400 border-gray-600'
                  }`}>
                    {extension.developer.trustBadge === 'none' ? 'Unverified' : extension.developer.trustBadge}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  {extension.developer.githubUrl && (
                    <a href={extension.developer.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white">
                      <Code className="w-4 h-4" /> GitHub
                    </a>
                  )}
                  {extension.developer.linkedinUrl && (
                    <a href={extension.developer.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white">
                      <User className="w-4 h-4" /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>

            {extension.alternatives.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Safer Alternatives
                </h2>
                <div className="space-y-3">
                  {extension.alternatives.map((alt, i) => (
                    <Link href={`/extensions/${alt.alternative.id}`} key={i} className="block bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{alt.alternative.name}</span>
                        <span className="text-xs text-emerald-400">-{alt.permissionDelta} perms</span>
                      </div>
                      <div className="text-xs text-gray-500">{alt.reason}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
