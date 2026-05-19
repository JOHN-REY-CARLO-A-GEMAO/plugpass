'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldCheck, ShieldAlert, Code, User, Globe } from 'lucide-react'

interface Developer {
  id: string
  name: string
  trustBadge: string
  verificationLevel: string
  githubUrl: string | null
  linkedinUrl: string | null
  extensionCount: number
  avgRiskScore: number
}

const badgeIcons: Record<string, React.ReactNode> = {
  verified: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
  partial: <Shield className="w-5 h-5 text-amber-400" />,
  identified: <Shield className="w-5 h-5 text-blue-400" />,
  none: <ShieldAlert className="w-5 h-5 text-gray-500" />,
}

const badgeColors: Record<string, string> = {
  verified: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  identified: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  none: 'bg-gray-700 text-gray-400 border-gray-600',
}

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(data => {
        setDevelopers(data)
        setLoading(false)
      })
  }, [])

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Developer Registry</h1>
          <p className="text-gray-400">Track verified AI plugin developers and their trust scores</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading developers...</div>
        ) : developers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No developers registered yet</p>
            <p className="text-sm text-gray-600">Scan extensions to populate the registry</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {developers.map((dev) => (
              <div key={dev.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{dev.name}</h3>
                    <div className="text-sm text-gray-500">{dev.extensionCount} extension(s)</div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${badgeColors[dev.trustBadge]}`}>
                    {badgeIcons[dev.trustBadge]}
                    <span className="ml-1 capitalize">{dev.trustBadge}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Avg Risk Score</span>
                    <span className={dev.avgRiskScore < 25 ? 'text-emerald-400' : dev.avgRiskScore < 50 ? 'text-amber-400' : 'text-red-400'}>
                      {dev.avgRiskScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Verification</span>
                    <span className="capitalize">{dev.verificationLevel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
                  {dev.githubUrl && (
                    <a href={dev.githubUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                      <Code className="w-4 h-4" />
                    </a>
                  )}
                  {dev.linkedinUrl && (
                    <a href={dev.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                      <User className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
