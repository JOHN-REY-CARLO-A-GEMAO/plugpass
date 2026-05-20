export interface ExtensionSummary {
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

export interface ExtensionDetail {
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
}

export interface AuditSummary {
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

export interface DeveloperSummary {
  id: string
  name: string
  trustBadge: string
  verificationLevel: string
  extensionCount: number
  avgRiskScore: number
}
