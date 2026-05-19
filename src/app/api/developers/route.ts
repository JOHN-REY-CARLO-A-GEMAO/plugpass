import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const developers = await prisma.developer.findMany({
    include: {
      extensions: true,
    },
    orderBy: { extensions: { _count: 'desc' } }
  })

  const summaries = developers.map(dev => ({
    id: dev.id,
    name: dev.name,
    trustBadge: dev.trustBadge,
    verificationLevel: dev.verificationLevel,
    githubUrl: dev.githubUrl,
    linkedinUrl: dev.linkedinUrl,
    extensionCount: dev.extensions.length,
    avgRiskScore: dev.extensions.length > 0
      ? Math.round(dev.extensions.reduce((sum, e) => sum + e.riskScore, 0) / dev.extensions.length)
      : 0,
  }))

  return NextResponse.json(summaries)
}