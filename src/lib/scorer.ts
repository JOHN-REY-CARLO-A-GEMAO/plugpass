import { categorizePermission, getSensitivePermissions } from './scanner'

export interface RiskBreakdown {
  permissionScore: number
  sensitivityScore: number
  developerScore: number
  policyScore: number
  total: number
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
}

export function calculateRiskScore(
  permissions: string[],
  developerTrust: 'verified' | 'partial' | 'unverified',
  hasPrivacyPolicy: boolean,
  policyDelta: number = 0
): RiskBreakdown {
  const factors: string[] = []

  const permissionCount = permissions.length
  const permissionScore = Math.min(permissionCount * 5, 40)
  if (permissionCount > 10) factors.push(`High permission count: ${permissionCount}`)
  if (permissionCount > 5) factors.push(`Above-average permissions: ${permissionCount}`)

  const sensitivePerms = getSensitivePermissions(permissions)
  const criticalCount = sensitivePerms.filter(p => {
    const cat = categorizePermission(p)
    return cat.sensitivity === 'critical'
  }).length
  const highCount = sensitivePerms.filter(p => {
    const cat = categorizePermission(p)
    return cat.sensitivity === 'high'
  }).length

  const sensitivityScore = Math.min((criticalCount * 15) + (highCount * 8) + (sensitivePerms.length * 3), 35)
  if (criticalCount > 0) factors.push(`${criticalCount} critical permission(s) detected`)
  if (highCount > 0) factors.push(`${highCount} high-sensitivity permission(s)`)

  const developerScores: Record<string, number> = { verified: 5, partial: 15, unverified: 25 }
  const developerScore = developerScores[developerTrust] ?? 25
  if (developerTrust === 'unverified') factors.push('Developer identity not verified')
  if (developerTrust === 'partial') factors.push('Developer partially verified')

  const policyScore = hasPrivacyPolicy ? 0 : 15
  const deltaPenalty = Math.min(policyDelta * 2, 20)
  if (!hasPrivacyPolicy) factors.push('No privacy policy found')
  if (policyDelta > 0) factors.push(`Policy-behavior delta: ${policyDelta}%`)

  const total = Math.min(permissionScore + sensitivityScore + developerScore + policyScore + deltaPenalty, 100)

  let level: RiskBreakdown['level'] = 'low'
  if (total >= 70) level = 'critical'
  else if (total >= 50) level = 'high'
  else if (total >= 25) level = 'medium'

  return {
    permissionScore,
    sensitivityScore,
    developerScore,
    policyScore,
    total,
    level,
    factors,
  }
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'low': return '#22c55e'
    case 'medium': return '#f59e0b'
    case 'high': return '#ef4444'
    case 'critical': return '#991b1b'
    default: return '#6b7280'
  }
}

export function getRiskLabel(level: string): string {
  switch (level) {
    case 'low': return 'Low Risk'
    case 'medium': return 'Medium Risk'
    case 'high': return 'High Risk'
    case 'critical': return 'Critical Risk'
    default: return 'Unknown'
  }
}
