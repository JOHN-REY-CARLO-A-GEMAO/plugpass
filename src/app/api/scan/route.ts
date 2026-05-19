import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scanExtension, categorizePermission, getSensitivePermissions } from '@/lib/scanner'
import { calculateRiskScore } from '@/lib/scorer'
import { getOrCreateDeveloper } from '@/lib/registry'
import { generateRecommendations } from '@/lib/recommendations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { chromeId } = body

    if (!chromeId) {
      return NextResponse.json({ error: 'Chrome extension ID is required' }, { status: 400 })
    }

    const scanned = await scanExtension(chromeId)
    if (!scanned) {
      return NextResponse.json({
        error: 'Failed to scan extension. The extension may not exist or could not be downloaded from Chrome Web Store.',
        suggestion: 'Verify the ID is correct: https://chromewebstore.google.com/detail/EXAMPLE_ID'
      }, { status: 404 })
    }

    const developer = await getOrCreateDeveloper(scanned.developerName)

    const existing = await prisma.extension.findUnique({
      where: { chromeId: scanned.chromeId }
    })

    if (existing) {
      await prisma.permission.deleteMany({ where: { extensionId: existing.id } })
      await prisma.dataPathway.deleteMany({ where: { extensionId: existing.id } })
    }

    const developerTrust = developer.verificationLevel === 'full'
      ? 'verified'
      : developer.verificationLevel === 'partial'
      ? 'partial'
      : 'unverified'

    const riskBreakdown = calculateRiskScore(
      scanned.permissions,
      developerTrust,
      !!scanned.privacyPolicyUrl
    )

    const extension = await prisma.extension.upsert({
      where: { chromeId: scanned.chromeId },
      create: {
        chromeId: scanned.chromeId,
        name: scanned.name,
        version: scanned.version,
        description: scanned.description,
        iconUrl: scanned.iconUrl,
        storeUrl: scanned.storeUrl,
        privacyPolicyUrl: scanned.privacyPolicyUrl,
        developerId: developer.id,
        riskScore: riskBreakdown.total,
        riskLevel: riskBreakdown.level,
      },
      update: {
        name: scanned.name,
        version: scanned.version,
        description: scanned.description,
        iconUrl: scanned.iconUrl,
        privacyPolicyUrl: scanned.privacyPolicyUrl,
        riskScore: riskBreakdown.total,
        riskLevel: riskBreakdown.level,
        lastScanned: new Date(),
      }
    })

    const permissions = scanned.permissions.map(p => {
      const cat = categorizePermission(p)
      return {
        extensionId: extension.id,
        name: p,
        category: cat.category,
        sensitivity: cat.sensitivity,
        description: cat.description,
      }
    })

    if (permissions.length > 0) {
      await prisma.permission.createMany({ data: permissions })
    }

    if (scanned.hostPermissions.length > 0) {
      const pathways = scanned.hostPermissions.map(host => ({
        extensionId: extension.id,
        apiEndpoint: host,
        dataType: 'page content',
        direction: 'read',
        policyClaim: null,
        actualBehavior: null,
        policyDelta: 0,
      }))
      await prisma.dataPathway.createMany({ data: pathways })
    }

    const recommendations = generateRecommendations(
      scanned.name,
      scanned.description,
      scanned.permissions,
      scanned.hostPermissions,
      developerTrust,
      !!scanned.privacyPolicyUrl
    )

    return NextResponse.json({
      extension: {
        id: extension.id,
        name: extension.name,
        riskScore: extension.riskScore,
        riskLevel: extension.riskLevel,
        permissionCount: permissions.length,
        sensitiveCount: getSensitivePermissions(scanned.permissions).length,
      },
      riskBreakdown,
      recommendations,
      message: existing ? 'Extension updated' : 'Extension scanned successfully',
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'An unexpected error occurred',
    }, { status: 500 })
  }
}
