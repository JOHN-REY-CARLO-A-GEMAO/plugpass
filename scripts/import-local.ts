import { prisma } from '../src/lib/db'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

interface Manifest {
  name?: string
  version?: string
  description?: string
  author?: string | { email?: string; name?: string }
  permissions?: string[]
  host_permissions?: string[]
  content_scripts?: any[]
  background?: any
  default_locale?: string
  homepage_url?: string
}

interface LocaleMessages {
  [key: string]: { message: string }
}

function resolveI18nName(manifest: Manifest, versionDir: string): string {
  const rawName = manifest.name || 'Unknown Extension'
  if (!rawName.startsWith('__MSG_')) return rawName

  const msgKey = rawName.replace('__MSG_', '').replace('__', '')
  const locale = manifest.default_locale || 'en'
  const localePath = path.join(versionDir, '_locales', locale, 'messages.json')

  if (fs.existsSync(localePath)) {
    try {
      const messages: LocaleMessages = JSON.parse(fs.readFileSync(localePath, 'utf8'))
      if (messages[msgKey]?.message) return messages[msgKey].message
    } catch {}
  }

  // Try English as fallback
  if (locale !== 'en') {
    const enPath = path.join(versionDir, '_locales', 'en', 'messages.json')
    if (fs.existsSync(enPath)) {
      try {
        const messages: LocaleMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'))
        if (messages[msgKey]?.message) return messages[msgKey].message
      } catch {}
    }
  }

  return rawName
}

function resolveI18nDescription(manifest: Manifest, versionDir: string): string {
  const rawDesc = manifest.description || ''
  if (!rawDesc.startsWith('__MSG_')) return rawDesc

  const msgKey = rawDesc.replace('__MSG_', '').replace('__', '')
  const locale = manifest.default_locale || 'en'
  const localePath = path.join(versionDir, '_locales', locale, 'messages.json')

  if (fs.existsSync(localePath)) {
    try {
      const messages: LocaleMessages = JSON.parse(fs.readFileSync(localePath, 'utf8'))
      if (messages[msgKey]?.message) return messages[msgKey].message
    } catch {}
  }

  return rawDesc
}

function calculateRiskFromManifest(manifest: Manifest): { score: number; level: string } {
  const perms = manifest.permissions || []
  const hostPerms = manifest.host_permissions || []
  let score = 0
  const factors: string[] = []

  const criticalPerms = ['cookies', 'webRequest', 'webRequestBlocking', 'proxy', 'debugger', 'nativeMessaging', 'management', 'privacy']
  const highPerms = ['tabs', 'webNavigation', 'history', 'bookmarks', 'downloads', 'system', 'scripting', 'identity', 'clipboardRead']
  const mediumPerms = ['storage', 'notifications', 'alarms', 'contextMenus', 'declarativeNetRequest']

  const criticalCount = perms.filter(p => criticalPerms.includes(p)).length
  const highCount = perms.filter(p => highPerms.includes(p)).length
  const mediumCount = perms.filter(p => mediumPerms.includes(p)).length

  score += criticalCount * 12
  score += highCount * 7
  score += mediumCount * 3

  if (hostPerms.includes('<all_urls>')) {
    score += 20
    factors.push('Access to all websites')
  } else if (hostPerms.length > 3) {
    score += 10
    factors.push(`Access to ${hostPerms.length} site patterns`)
  }

  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    score += 5
    factors.push('Injects content scripts into pages')
  }

  if (manifest.background) {
    score += 3
  }

  score = Math.min(score, 100)

  let level = 'low'
  if (score >= 70) level = 'critical'
  else if (score >= 50) level = 'high'
  else if (score >= 25) level = 'medium'

  return { score, level }
}

function getDeveloperName(manifest: Manifest, chromeId: string): string {
  if (manifest.author && typeof manifest.author === 'string') return manifest.author
  if (typeof manifest.author === 'object' && manifest.author !== null) {
    const authorObj = manifest.author as any
    if (authorObj.email) return authorObj.email
    if (authorObj.name) return authorObj.name
  }
  return `Developer (${chromeId.substring(0, 8)}...)`
}

async function main() {
  const homeDir = os.homedir()
  const chromePath = path.join(
    homeDir,
    'AppData',
    'Local',
    'Google',
    'Chrome',
    'User Data',
    'Default',
    'Extensions'
  )

  if (!fs.existsSync(chromePath)) {
    console.error('Chrome extensions directory not found:', chromePath)
    process.exit(1)
  }

  console.log('Scanning Chrome extensions from:', chromePath)

  const extensionDirs = fs.readdirSync(chromePath).filter(name => {
    const fullPath = path.join(chromePath, name)
    return fs.statSync(fullPath).isDirectory()
  })

  console.log(`Found ${extensionDirs.length} extensions`)

  let imported = 0
  let skipped = 0

  for (const chromeId of extensionDirs) {
    const extDir = path.join(chromePath, chromeId)
    const versionDirs = fs.readdirSync(extDir).filter(name => {
      const fullPath = path.join(extDir, name)
      return fs.statSync(fullPath).isDirectory()
    })

    if (versionDirs.length === 0) continue

    const versionDir = path.join(extDir, versionDirs[0])
    const manifestPath = path.join(versionDir, 'manifest.json')

    if (!fs.existsSync(manifestPath)) continue

    try {
      const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const name = resolveI18nName(manifest, versionDir)
      const description = resolveI18nDescription(manifest, versionDir)
      const version = manifest.version || 'unknown'
      const developerName = getDeveloperName(manifest, chromeId)
      const homepageUrl = manifest.homepage_url || null

      const allPermissions = [
        ...(manifest.permissions || []),
        ...(manifest.host_permissions || [])
      ]

      const risk = calculateRiskFromManifest(manifest)

      const developer = await prisma.developer.upsert({
        where: { id: `local-${chromeId}` },
        update: { name: developerName },
        create: {
          id: `local-${chromeId}`,
          name: developerName,
          trustBadge: 'none',
          verificationLevel: 'unverified',
        }
      })

      const existing = await prisma.extension.findUnique({
        where: { chromeId: `local-${chromeId}` }
      })

      if (existing) {
        await prisma.permission.deleteMany({ where: { extensionId: existing.id } })
        await prisma.dataPathway.deleteMany({ where: { extensionId: existing.id } })
      }

      const extension = await prisma.extension.upsert({
        where: { chromeId: `local-${chromeId}` },
        create: {
          chromeId: `local-${chromeId}`,
          name,
          version,
          description: description || 'No description available',
          storeUrl: `https://chromewebstore.google.com/detail/${chromeId}`,
          privacyPolicyUrl: homepageUrl,
          developerId: developer.id,
          riskScore: risk.score,
          riskLevel: risk.level,
        },
        update: {
          name,
          version,
          description: description || 'No description available',
          riskScore: risk.score,
          riskLevel: risk.level,
          lastScanned: new Date(),
        }
      })

      const permData = allPermissions.map(perm => {
        let category = 'other'
        let sensitivity = 'low'
        let desc = perm

        if (['cookies'].includes(perm)) {
          category = 'authentication'; sensitivity = 'critical'; desc = 'Read and modify cookies'
        } else if (['webRequest', 'webRequestBlocking', 'webRequestAuthProvider'].includes(perm)) {
          category = 'network'; sensitivity = 'high'; desc = 'Intercept network requests'
        } else if (['proxy'].includes(perm)) {
          category = 'network'; sensitivity = 'critical'; desc = 'Control proxy settings'
        } else if (['tabs'].includes(perm)) {
          category = 'browsing'; sensitivity = 'high'; desc = 'Access browser tabs'
        } else if (['webNavigation'].includes(perm)) {
          category = 'browsing'; sensitivity = 'high'; desc = 'Track navigation'
        } else if (['history'].includes(perm)) {
          category = 'browsing'; sensitivity = 'high'; desc = 'Access browsing history'
        } else if (['management'].includes(perm)) {
          category = 'system'; sensitivity = 'high'; desc = 'Manage other extensions'
        } else if (['privacy'].includes(perm)) {
          category = 'settings'; sensitivity = 'high'; desc = 'Access privacy settings'
        } else if (['nativeMessaging'].includes(perm)) {
          category = 'system'; sensitivity = 'critical'; desc = 'Communicate with native apps'
        } else if (['debugger'].includes(perm)) {
          category = 'system'; sensitivity = 'critical'; desc = 'Debug browser tabs'
        } else if (['scripting', 'userScripts'].includes(perm)) {
          category = 'system'; sensitivity = 'high'; desc = 'Execute scripts in pages'
        } else if (['identity'].includes(perm)) {
          category = 'authentication'; sensitivity = 'high'; desc = 'Access Google identity'
        } else if (['clipboardRead'].includes(perm)) {
          category = 'data'; sensitivity = 'high'; desc = 'Read clipboard'
        } else if (['clipboardWrite'].includes(perm)) {
          category = 'data'; sensitivity = 'medium'; desc = 'Write to clipboard'
        } else if (['downloads'].includes(perm)) {
          category = 'data'; sensitivity = 'medium'; desc = 'Manage downloads'
        } else if (['bookmarks'].includes(perm)) {
          category = 'data'; sensitivity = 'medium'; desc = 'Access bookmarks'
        } else if (['storage'].includes(perm)) {
          category = 'data'; sensitivity = 'medium'; desc = 'Access browser storage'
        } else if (['notifications'].includes(perm)) {
          category = 'system'; sensitivity = 'low'; desc = 'Show notifications'
        } else if (['alarms'].includes(perm)) {
          category = 'system'; sensitivity = 'low'; desc = 'Schedule alarms'
        } else if (['contextMenus'].includes(perm)) {
          category = 'system'; sensitivity = 'low'; desc = 'Add context menu items'
        } else if (['activeTab'].includes(perm)) {
          category = 'browsing'; sensitivity = 'low'; desc = 'Access active tab'
        } else if (['declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'declarativeNetRequestFeedback'].includes(perm)) {
          category = 'network'; sensitivity = 'medium'; desc = 'Block/modify network requests'
        } else if (['offscreen'].includes(perm)) {
          category = 'system'; sensitivity = 'medium'; desc = 'Run offscreen documents'
        } else if (['unlimitedStorage'].includes(perm)) {
          category = 'data'; sensitivity = 'low'; desc = 'Unlimited client-side storage'
        } else if (perm.startsWith('http') || perm === '<all_urls>') {
          category = 'host'; sensitivity = perm === '<all_urls>' ? 'critical' : 'medium'; desc = `Host access: ${perm}`
        }

        return {
          extensionId: extension.id,
          name: perm,
          category,
          sensitivity,
          description: desc,
        }
      })

      if (permData.length > 0) {
        await prisma.permission.createMany({ data: permData })
      }

      const hasContentScripts = manifest.content_scripts && manifest.content_scripts.length > 0
      const hasBackground = manifest.background !== undefined

      const pathwayData: any[] = []

      if (manifest.host_permissions && manifest.host_permissions.length > 0) {
        for (const host of manifest.host_permissions) {
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

      if (hasContentScripts) {
        pathwayData.push({
          extensionId: extension.id,
          apiEndpoint: 'injected scripts',
          dataType: 'DOM manipulation',
          direction: 'inject',
          policyClaim: null,
          actualBehavior: null,
          policyDelta: 0,
        })
      }

      if (hasBackground) {
        pathwayData.push({
          extensionId: extension.id,
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

      imported++
      console.log(`  ✓ ${name} (risk: ${risk.score}/100 - ${risk.level})`)
    } catch (err) {
      skipped++
      console.log(`  ✗ ${chromeId}: ${err}`)
    }
  }

  console.log(`\nImported: ${imported} | Skipped: ${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
