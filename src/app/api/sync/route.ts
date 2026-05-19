import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateRiskFromManifest, scanLocalExtensions } from '@/lib/scanner'

export async function POST() {
  try {
    const localExtensions = await scanLocalExtensions()

    if (!localExtensions || localExtensions.length === 0) {
      return NextResponse.json({
        error: 'No Chrome extensions found. Make sure Chrome is installed.',
      }, { status: 404 })
    }

    const existingIds = new Set(
      (await prisma.extension.findMany({
        where: { chromeId: { startsWith: 'local-' } },
        select: { chromeId: true }
      })).map(e => e.chromeId)
    )

    const incomingIds = new Set(
      localExtensions.map(e => `local-${e.chromeId}`)
    )

    const toRemove = [...existingIds].filter(id => !incomingIds.has(id))
    const toAdd = [...incomingIds].filter(id => !existingIds.has(id))
    const toUpdate = [...incomingIds].filter(id => existingIds.has(id))

    let removed = 0
    let added = 0
    let updated = 0

    for (const chromeId of toRemove) {
      const ext = await prisma.extension.findUnique({
        where: { chromeId },
        include: { developer: true }
      })
      if (ext) {
        await prisma.permission.deleteMany({ where: { extensionId: ext.id } })
        await prisma.dataPathway.deleteMany({ where: { extensionId: ext.id } })
        await prisma.alternative.deleteMany({ where: { OR: [{ primaryId: ext.id }, { alternativeId: ext.id }] } })
        await prisma.extension.delete({ where: { chromeId } })

        const extCount = await prisma.extension.count({
          where: { developerId: ext.developerId }
        })
        if (extCount === 0) {
          await prisma.developer.delete({ where: { id: ext.developerId } })
        }
        removed++
      }
    }

    for (const localExt of localExtensions) {
      const chromeId = `local-${localExt.chromeId}`
      const developerName = localExt.developerName
      const risk = calculateRiskFromManifest(localExt.manifest)

      const developer = await prisma.developer.upsert({
        where: { id: chromeId },
        update: { name: developerName },
        create: {
          id: chromeId,
          name: developerName,
          trustBadge: 'none',
          verificationLevel: 'unverified',
        }
      })

      const existing = await prisma.extension.findUnique({
        where: { chromeId }
      })

      if (existing) {
        await prisma.permission.deleteMany({ where: { extensionId: existing.id } })
        await prisma.dataPathway.deleteMany({ where: { extensionId: existing.id } })

        await prisma.extension.update({
          where: { chromeId },
          data: {
            name: localExt.name,
            version: localExt.version,
            description: localExt.description || 'No description available',
            riskScore: risk.score,
            riskLevel: risk.level,
            lastScanned: new Date(),
          }
        })

        const permData = localExt.allPermissions.map(perm => {
          const { category, sensitivity, description } = categorizeLocalPermission(perm)
          return {
            extensionId: existing.id,
            name: perm,
            category,
            sensitivity,
            description,
          }
        })

        if (permData.length > 0) {
          await prisma.permission.createMany({ data: permData })
        }

        const pathwayData: any[] = []
        if (localExt.manifest.host_permissions) {
          for (const host of localExt.manifest.host_permissions) {
            pathwayData.push({
              extensionId: existing.id,
              apiEndpoint: host,
              dataType: 'page content',
              direction: 'read',
              policyClaim: null,
              actualBehavior: null,
              policyDelta: 0,
            })
          }
        }
        if (localExt.manifest.content_scripts?.length) {
          pathwayData.push({
            extensionId: existing.id,
            apiEndpoint: 'injected scripts',
            dataType: 'DOM manipulation',
            direction: 'inject',
            policyClaim: null,
            actualBehavior: null,
            policyDelta: 0,
          })
        }
        if (localExt.manifest.background) {
          pathwayData.push({
            extensionId: existing.id,
            apiEndpoint: 'background service',
            dataType: 'persistent process',
            direction: 'background',
            policyClaim: null,
            actualBehavior: null,
            policyDelta: 0,
          })
        }
        if (pathwayData.length > 0) {
          await prisma.dataPathway.createMany({ data: pathwayData })
        }

        updated++
      } else {
        const extension = await prisma.extension.create({
          data: {
            chromeId,
            name: localExt.name,
            version: localExt.version,
            description: localExt.description || 'No description available',
            storeUrl: `https://chromewebstore.google.com/detail/${localExt.chromeId}`,
            privacyPolicyUrl: localExt.manifest.homepage_url || null,
            developerId: developer.id,
            riskScore: risk.score,
            riskLevel: risk.level,
          }
        })

        const permData = localExt.allPermissions.map(perm => {
          const { category, sensitivity, description } = categorizeLocalPermission(perm)
          return {
            extensionId: extension.id,
            name: perm,
            category,
            sensitivity,
            description,
          }
        })

        if (permData.length > 0) {
          await prisma.permission.createMany({ data: permData })
        }

        const pathwayData: any[] = []
        if (localExt.manifest.host_permissions) {
          for (const host of localExt.manifest.host_permissions) {
            pathwayData.push({
              extensionId: extension.id,
              apiEndpoint: host,
              dataType: 'page content',
              direction: 'read',
              policyClaim: null,
              actualBehavior: null,
              policyDelta: 0,
            })
          }
        }
        if (pathwayData.length > 0) {
          await prisma.dataPathway.createMany({ data: pathwayData })
        }

        added++
      }
    }

    return NextResponse.json({
      removed,
      added,
      updated,
      total: localExtensions.length,
      message: `Synced ${localExtensions.length} extensions`,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Sync failed',
    }, { status: 500 })
  }
}

function categorizeLocalPermission(perm: string) {
  const critical = ['cookies', 'webRequest', 'webRequestBlocking', 'proxy', 'debugger', 'nativeMessaging', 'management', 'privacy']
  const high = ['tabs', 'webNavigation', 'history', 'bookmarks', 'downloads', 'system', 'scripting', 'identity', 'clipboardRead', 'declarativeNetRequestWithHostAccess']
  const medium = ['storage', 'notifications', 'alarms', 'contextMenus', 'declarativeNetRequest', 'declarativeNetRequestFeedback', 'offscreen']
  const low = ['activeTab', 'unlimitedStorage', 'clipboardWrite']

  let category = 'other'
  let sensitivity = 'low'
  let description = perm

  if (critical.includes(perm)) {
    category = 'authentication'; sensitivity = 'critical'
    description = perm === 'cookies' ? 'Read and modify cookies' : `Critical: ${perm}`
  } else if (high.includes(perm)) {
    category = 'browsing'; sensitivity = 'high'
    description = perm === 'tabs' ? 'Access browser tabs' : `High: ${perm}`
  } else if (medium.includes(perm)) {
    category = 'data'; sensitivity = 'medium'
    description = perm === 'storage' ? 'Access browser storage' : `Medium: ${perm}`
  } else if (low.includes(perm)) {
    category = 'system'; sensitivity = 'low'
    description = `Low: ${perm}`
  } else if (perm.startsWith('http') || perm === '<all_urls>') {
    category = 'host'; sensitivity = perm === '<all_urls>' ? 'critical' : 'medium'
    description = `Host access: ${perm}`
  }

  return { category, sensitivity, description }
}
