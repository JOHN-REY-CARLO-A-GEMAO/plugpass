import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const riskLevel = searchParams.get('riskLevel')
  const search = searchParams.get('search')

  const where: any = {}
  if (riskLevel) where.riskLevel = riskLevel
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const extensions = await prisma.extension.findMany({
    where,
    include: {
      developer: true,
      permissions: true,
    },
    orderBy: { riskScore: 'desc' }
  })

  const summaries = extensions.map(ext => ({
    id: ext.id,
    chromeId: ext.chromeId,
    name: ext.name,
    description: ext.description,
    iconUrl: ext.iconUrl,
    riskScore: ext.riskScore,
    riskLevel: ext.riskLevel,
    developerName: ext.developer.name,
    permissionCount: ext.permissions.length,
    sensitivePermissionCount: ext.permissions.filter(p => p.sensitivity === 'high' || p.sensitivity === 'critical').length,
  }))

  return NextResponse.json(summaries)
}
