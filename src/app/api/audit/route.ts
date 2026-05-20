import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const extensions = await prisma.extension.findMany({
    include: {
      developer: true,
      permissions: true,
      alternatives: true,
    },
    orderBy: { riskScore: 'desc' },
  })

  if (extensions.length === 0) {
    return NextResponse.json({
      total: 0,
      avgRiskScore: 0,
      medianRiskScore: 0,
      riskBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
      categoryBreakdown: [],
      developerBreakdown: [],
      criticalOutliers: [],
      permissionStats: { total: 0, avgPerExtension: 0, mostCommon: [] },
      alternativeCoverage: 0,
    })
  }

  const scores = extensions.map(e => e.riskScore).sort((a, b) => a - b)
  const avgRiskScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const medianRiskScore = scores.length % 2 === 0
    ? Math.round((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2)
    : scores[Math.floor(scores.length / 2)]

  const riskBreakdown = {
    low: extensions.filter(e => e.riskLevel === 'low').length,
    medium: extensions.filter(e => e.riskLevel === 'medium').length,
    high: extensions.filter(e => e.riskLevel === 'high').length,
    critical: extensions.filter(e => e.riskLevel === 'critical').length,
  }

  const { classifyExtension } = await import('@/lib/recommendations')
  const categoryMap = new Map<string, { count: number; avgScore: number; totalScore: number }>()

  for (const ext of extensions) {
    const permNames = ext.permissions.map(p => p.name)
    const { category } = classifyExtension(ext.name, ext.description, permNames)
    const key = category === 'unknown' ? 'Other' : category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')
    const existing = categoryMap.get(key) || { count: 0, avgScore: 0, totalScore: 0 }
    existing.count += 1
    existing.totalScore += ext.riskScore
    existing.avgScore = Math.round(existing.totalScore / existing.count)
    categoryMap.set(key, existing)
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    .sort((a, b) => b.count - a.count)

  const developerMap = new Map<string, { count: number; avgScore: number; totalScore: number; trustBadge: string }>()
  for (const ext of extensions) {
    const key = ext.developer.name
    const existing = developerMap.get(key) || { count: 0, avgScore: 0, totalScore: 0, trustBadge: ext.developer.trustBadge }
    existing.count += 1
    existing.totalScore += ext.riskScore
    existing.avgScore = Math.round(existing.totalScore / existing.count)
    developerMap.set(key, existing)
  }

  const developerBreakdown = Array.from(developerMap.entries())
    .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore, trustBadge: data.trustBadge }))
    .sort((a, b) => b.avgScore - a.avgScore)

  const criticalOutliers = extensions
    .filter(e => e.riskLevel === 'critical' || e.riskLevel === 'high')
    .slice(0, 10)
    .map(e => ({
      id: e.id,
      name: e.name,
      riskScore: e.riskScore,
      riskLevel: e.riskLevel,
      permissionCount: e.permissions.length,
      developerName: e.developer.name,
    }))

  const allPermissions = extensions.flatMap(e => e.permissions.map(p => p.name))
  const permFrequency = new Map<string, number>()
  for (const perm of allPermissions) {
    permFrequency.set(perm, (permFrequency.get(perm) || 0) + 1)
  }
  const mostCommon = Array.from(permFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const totalPermissions = allPermissions.length
  const avgPerExtension = Math.round((totalPermissions / extensions.length) * 10) / 10

  const withAlternatives = extensions.filter(e => e.alternatives.length > 0).length
  const alternativeCoverage = Math.round((withAlternatives / extensions.length) * 100)

  return NextResponse.json({
    total: extensions.length,
    avgRiskScore,
    medianRiskScore,
    riskBreakdown,
    categoryBreakdown,
    developerBreakdown,
    criticalOutliers,
    permissionStats: {
      total: totalPermissions,
      avgPerExtension,
      mostCommon,
    },
    alternativeCoverage,
  })
}
