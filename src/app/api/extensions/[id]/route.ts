import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateRiskScore } from '@/lib/scorer'
import { generateRecommendations } from '@/lib/recommendations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const extension = await prisma.extension.findUnique({
    where: { id },
    include: {
      developer: true,
      permissions: true,
      dataPathways: true,
      alternatives: {
        include: {
          alternative: true
        }
      }
    }
  })

  if (!extension) {
    return NextResponse.json({ error: 'Extension not found' }, { status: 404 })
  }

  const developerTrust = extension.developer.verificationLevel === 'full'
    ? 'verified'
    : extension.developer.verificationLevel === 'partial'
    ? 'partial'
    : 'unverified'

  const avgPolicyDelta = extension.dataPathways.length > 0
    ? Math.round(extension.dataPathways.reduce((sum, dp) => sum + dp.policyDelta, 0) / extension.dataPathways.length)
    : 0

  const permNames = extension.permissions.map(p => p.name)
  const hostPerms = extension.permissions
    .filter(p => p.category === 'host')
    .map(p => p.name)

  const riskBreakdown = calculateRiskScore(
    permNames,
    developerTrust,
    !!extension.privacyPolicyUrl,
    avgPolicyDelta
  )

  const recommendations = generateRecommendations(
    extension.name,
    extension.description,
    permNames,
    hostPerms,
    developerTrust,
    !!extension.privacyPolicyUrl
  )

  return NextResponse.json({
    id: extension.id,
    chromeId: extension.chromeId,
    name: extension.name,
    version: extension.version,
    description: extension.description,
    iconUrl: extension.iconUrl,
    storeUrl: extension.storeUrl,
    privacyPolicyUrl: extension.privacyPolicyUrl,
    riskScore: extension.riskScore,
    riskLevel: extension.riskLevel,
    developer: {
      name: extension.developer.name,
      trustBadge: extension.developer.trustBadge,
      verificationLevel: extension.developer.verificationLevel,
      githubUrl: extension.developer.githubUrl,
      linkedinUrl: extension.developer.linkedinUrl,
    },
    permissions: extension.permissions.map(p => ({
      name: p.name,
      category: p.category,
      sensitivity: p.sensitivity,
      description: p.description,
    })),
    dataPathways: extension.dataPathways.map(dp => ({
      apiEndpoint: dp.apiEndpoint,
      dataType: dp.dataType,
      direction: dp.direction,
      policyClaim: dp.policyClaim,
      actualBehavior: dp.actualBehavior,
      policyDelta: dp.policyDelta,
    })),
    alternatives: extension.alternatives.map(a => ({
      alternative: {
        id: a.alternative.id,
        name: a.alternative.name,
        riskScore: a.alternative.riskScore,
        riskLevel: a.alternative.riskLevel,
      },
      reason: a.reason,
      permissionDelta: a.permissionDelta,
    })),
    riskFactors: riskBreakdown.factors,
    recommendations,
  })
}