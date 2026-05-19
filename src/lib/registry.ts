import { prisma } from './db'

export interface DeveloperProfile {
  id: string
  name: string
  email: string | null
  website: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  trustBadge: string
  verificationLevel: string
  extensionCount: number
  avgRiskScore: number
}

export async function getOrCreateDeveloper(name: string) {
  let developer = await prisma.developer.findFirst({
    where: { name: name }
  })

  if (!developer) {
    developer = await prisma.developer.create({
      data: { name }
    })
  }

  return developer
}

export async function verifyDeveloper(
  developerId: string,
  updates: {
    githubUrl?: string
    linkedinUrl?: string
    website?: string
    email?: string
  }
) {
  const developer = await prisma.developer.update({
    where: { id: developerId },
    data: updates
  })

  const badge = calculateTrustBadge(developer)
  const level = calculateVerificationLevel(developer)

  return prisma.developer.update({
    where: { id: developerId },
    data: { trustBadge: badge, verificationLevel: level }
  })
}

export async function getDeveloperProfile(developerId: string): Promise<DeveloperProfile | null> {
  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
    include: { extensions: true }
  })

  if (!developer) return null

  const avgRiskScore = developer.extensions.length > 0
    ? Math.round(developer.extensions.reduce((sum, e) => sum + e.riskScore, 0) / developer.extensions.length)
    : 0

  return {
    id: developer.id,
    name: developer.name,
    email: developer.email,
    website: developer.website,
    githubUrl: developer.githubUrl,
    linkedinUrl: developer.linkedinUrl,
    trustBadge: developer.trustBadge,
    verificationLevel: developer.verificationLevel,
    extensionCount: developer.extensions.length,
    avgRiskScore,
  }
}

export async function getTrustedDevelopers() {
  return prisma.developer.findMany({
    where: { trustBadge: { not: 'none' } },
    include: { extensions: true },
    orderBy: { extensions: { _count: 'desc' } }
  })
}

function calculateTrustBadge(developer: any): string {
  const hasGithub = !!developer.githubUrl
  const hasLinkedin = !!developer.linkedinUrl
  const hasWebsite = !!developer.website
  const hasEmail = !!developer.email

  const signals = [hasGithub, hasLinkedin, hasWebsite, hasEmail].filter(Boolean).length

  if (signals >= 3) return 'verified'
  if (signals >= 2) return 'partial'
  if (signals >= 1) return 'identified'
  return 'none'
}

function calculateVerificationLevel(developer: any): string {
  const hasGithub = !!developer.githubUrl
  const hasLinkedin = !!developer.linkedinUrl
  const hasWebsite = !!developer.website

  if (hasGithub && hasLinkedin && hasWebsite) return 'full'
  if (hasGithub || hasLinkedin) return 'partial'
  return 'unverified'
}
