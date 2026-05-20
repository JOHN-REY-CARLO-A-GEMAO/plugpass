import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import AdmZip from 'adm-zip'

export interface ScannedExtension {
  chromeId: string
  name: string
  version: string
  description: string
  iconUrl: string | null
  storeUrl: string
  privacyPolicyUrl: string | null
  developerName: string
  developerWebsite: string | null
  permissions: string[]
  hostPermissions: string[]
  category: string
  userCount: string
  rating: string
}

const SENSITIVE_PERMISSIONS = [
  'tabs', 'webNavigation', 'webRequest', 'webRequestBlocking',
  'cookies', 'storage', 'history', 'bookmarks', 'downloads',
  'management', 'privacy', 'proxy', 'system', 'debugger',
  'nativeMessaging', 'clipboardRead', 'clipboardWrite',
  'pageCapture', 'topSites', 'notifications',
]

const DATA_PERMISSIONS: Record<string, { category: string; sensitivity: string; description: string }> = {
  tabs: { category: 'browsing', sensitivity: 'high', description: 'Access to all browser tabs and URLs' },
  webNavigation: { category: 'browsing', sensitivity: 'high', description: 'Track navigation across all frames' },
  webRequest: { category: 'network', sensitivity: 'high', description: 'Intercept and modify network requests' },
  webRequestBlocking: { category: 'network', sensitivity: 'critical', description: 'Block and modify network requests' },
  cookies: { category: 'authentication', sensitivity: 'critical', description: 'Read and modify all cookies' },
  storage: { category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
  history: { category: 'browsing', sensitivity: 'high', description: 'Read and modify browsing history' },
  bookmarks: { category: 'data', sensitivity: 'medium', description: 'Read and modify bookmarks' },
  downloads: { category: 'data', sensitivity: 'medium', description: 'Manage downloads' },
  management: { category: 'system', sensitivity: 'high', description: 'Manage other extensions' },
  privacy: { category: 'settings', sensitivity: 'high', description: 'Access privacy settings' },
  proxy: { category: 'network', sensitivity: 'critical', description: 'Control proxy settings' },
  system: { category: 'system', sensitivity: 'high', description: 'Access system information' },
  debugger: { category: 'system', sensitivity: 'critical', description: 'Debug browser tabs' },
  nativeMessaging: { category: 'system', sensitivity: 'critical', description: 'Communicate with native applications' },
  clipboardRead: { category: 'data', sensitivity: 'high', description: 'Read clipboard contents' },
  clipboardWrite: { category: 'data', sensitivity: 'medium', description: 'Write to clipboard' },
  pageCapture: { category: 'browsing', sensitivity: 'high', description: 'Capture tab content as MHTML' },
  topSites: { category: 'browsing', sensitivity: 'medium', description: 'Access most visited sites' },
  notifications: { category: 'system', sensitivity: 'low', description: 'Display notifications' },
  activeTab: { category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
  identity: { category: 'authentication', sensitivity: 'high', description: 'Access Google identity' },
  scripting: { category: 'system', sensitivity: 'high', description: 'Execute scripts in web pages' },
  declarativeNetRequest: { category: 'network', sensitivity: 'medium', description: 'Block/modify network requests' },
  declarativeNetRequestWithHostAccess: { category: 'network', sensitivity: 'medium', description: 'Block/modify requests with host access' },
  declarativeNetRequestFeedback: { category: 'network', sensitivity: 'low', description: 'Receive declarative net request feedback' },
  offscreen: { category: 'system', sensitivity: 'medium', description: 'Run offscreen documents' },
  unlimitedStorage: { category: 'data', sensitivity: 'low', description: 'Unlimited client-side storage' },
  alarms: { category: 'system', sensitivity: 'low', description: 'Schedule alarms' },
  contextMenus: { category: 'system', sensitivity: 'low', description: 'Add context menu items' },
  userScripts: { category: 'system', sensitivity: 'high', description: 'Execute user scripts' },
  webRequestAuthProvider: { category: 'authentication', sensitivity: 'high', description: 'Provide web request auth' },
}

async function downloadCrx(chromeId: string): Promise<Buffer> {
  const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.6099.130&acceptformat=crx2,crx3&x=id%3D${chromeId}%26uc`

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download CRX: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  return buffer
}

function extractManifestFromCrx(crxBuffer: Buffer): { manifest: any; zip: AdmZip } {
  const magic = crxBuffer.slice(0, 4).toString()

  if (magic !== 'Cr24') {
    throw new Error('Not a valid CRX file')
  }

  const version = crxBuffer.readUInt32LE(4)

  let zipBuffer: Buffer
  if (version === 3) {
    const headerLength = crxBuffer.readUInt32LE(8)
    const zipStart = 12 + headerLength
    zipBuffer = crxBuffer.slice(zipStart)
  } else if (version === 2) {
    const pubKeyLength = crxBuffer.readUInt32LE(8)
    const sigLength = crxBuffer.readUInt32LE(12)
    const zipStart = 16 + pubKeyLength + sigLength
    zipBuffer = crxBuffer.slice(zipStart)
  } else {
    throw new Error(`Unsupported CRX version: ${version}`)
  }

  const zip = new AdmZip(zipBuffer)
  const manifestEntry = zip.getEntry('manifest.json')

  if (!manifestEntry) {
    throw new Error('manifest.json not found in CRX')
  }

  const manifestJson = manifestEntry.getData().toString('utf8')
  return { manifest: JSON.parse(manifestJson), zip }
}

function resolveI18nValue(manifest: any, key: string, zip: AdmZip | null = null, chromeId?: string): string {
  const raw = manifest[key] || ''
  if (!raw.startsWith('__MSG_')) return raw

  const msgKey = raw.replace('__MSG_', '').replace('__', '')
  const locale = manifest.default_locale || 'en'
  const localeOrder = [locale, 'en', 'en_US', 'en_GB']

  console.log(`[Plugpass i18n] Looking for key "${msgKey}" in ${chromeId || 'unknown'}, default_locale="${locale}"`)

  if (zip) {
    const entries = zip.getEntries()
    const localeEntries = entries
      .map(e => e.entryName)
      .filter(name => name.startsWith('_locales/') && name.endsWith('messages.json'))

    console.log(`[Plugpass i18n] Found locale files: ${localeEntries.join(', ')}`)

    for (const loc of localeOrder) {
      const targetPath = `_locales/${loc}/messages.json`
      const match = localeEntries.find(e => e === targetPath)
      if (match) {
        const entry = zip.getEntry(match)
        if (entry) {
          try {
            const messages = JSON.parse(entry.getData().toString('utf8'))
            console.log(`[Plugpass i18n] Parsed ${targetPath}, keys: ${Object.keys(messages).slice(0, 10).join(', ')}...`)
            if (messages[msgKey]) {
              console.log(`[Plugpass i18n] Found ${msgKey}:`, JSON.stringify(messages[msgKey]))
              if (messages[msgKey].message) return messages[msgKey].message
              if (typeof messages[msgKey] === 'string') return messages[msgKey]
            }
          } catch (e) {
            console.log(`[Plugpass i18n] Failed to parse ${targetPath}:`, e)
          }
        }
      }
    }

    for (const entryName of localeEntries) {
      const entry = zip.getEntry(entryName)
      if (entry) {
        try {
          const messages = JSON.parse(entry.getData().toString('utf8'))
          if (messages[msgKey]) {
            console.log(`[Plugpass i18n] Found ${msgKey} in ${entryName}:`, JSON.stringify(messages[msgKey]))
            if (messages[msgKey].message) return messages[msgKey].message
            if (typeof messages[msgKey] === 'string') return messages[msgKey]
          }
        } catch {}
      }
    }
  }

  console.log(`[Plugpass i18n] Could not resolve ${msgKey}, returning raw: ${raw}`)
  return raw
}

async function fetchFromChromeWebStore(chromeId: string): Promise<{ name: string; description: string } | null> {
  try {
    const url = `https://chromewebstore.google.com/detail/${chromeId}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) return null

    const html = await res.text()

    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/) || html.match(/<title>(.*?)\s*-\s*Chrome Web Store<\/title>/)
    const descMatch = html.match(/"description"\s*:\s*"([^"]+)"/) || html.match(/<meta\s+name="description"\s+content="(.*?)"/)

    const name = nameMatch ? nameMatch[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\"/g, '"') : ''
    const description = descMatch ? descMatch[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\"/g, '"') : ''

    if (name || description) {
      console.log(`[Plugpass] Chrome Web Store fallback for ${chromeId}: name="${name}", desc="${description.substring(0, 50)}..."`)
    }

    return { name, description }
  } catch (err) {
    console.log(`[Plugpass] Chrome Web Store fallback failed for ${chromeId}:`, err)
    return null
  }
}

export async function scanExtension(chromeId: string): Promise<ScannedExtension | null> {
  try {
    const crxBuffer = await downloadCrx(chromeId)
    const { manifest, zip } = extractManifestFromCrx(crxBuffer)

    let name = resolveI18nValue(manifest, 'name', zip, chromeId)
    let description = resolveI18nValue(manifest, 'description', zip, chromeId)

    if (name.startsWith('__MSG_') || description.startsWith('__MSG_')) {
      console.log(`[Plugpass] i18n resolution failed for ${chromeId}, falling back to Chrome Web Store`)
      const fallback = await fetchFromChromeWebStore(chromeId)
      if (fallback) {
        if (name.startsWith('__MSG_')) name = fallback.name
        if (description.startsWith('__MSG_')) description = fallback.description
      }
    }

    const version = manifest.version || 'unknown'
    const developerName = typeof manifest.author === 'string'
      ? manifest.author
      : manifest.author?.email || manifest.author?.name || `Developer (${chromeId.substring(0, 8)}...)`
    const homepageUrl = manifest.homepage_url || null

    const permissions = manifest.permissions || []
    const hostPermissions = manifest.host_permissions || []
    const allPermissions = [...permissions, ...hostPermissions]

    const iconPath = manifest.icons?.['128'] || manifest.icons?.['48'] || manifest.icons?.['16'] || null
    const iconUrl = iconPath ? `chrome-extension://${chromeId}/${iconPath}` : null

    return {
      chromeId,
      name,
      version,
      description,
      iconUrl,
      storeUrl: `https://chromewebstore.google.com/detail/${chromeId}`,
      privacyPolicyUrl: homepageUrl,
      developerName,
      developerWebsite: homepageUrl,
      permissions: allPermissions,
      hostPermissions,
      category: 'ai',
      userCount: 'unknown',
      rating: 'unknown',
    }
  } catch (err) {
    console.error('Scan failed:', err)
    return null
  }
}

export function categorizePermission(permission: string) {
  const key = permission.toLowerCase().replace(/<all_urls>/g, '').trim()
  return DATA_PERMISSIONS[key] || { category: 'other', sensitivity: 'low', description: permission }
}

export function getSensitivePermissions(permissions: string[]) {
  return permissions.filter(p => {
    const key = p.toLowerCase().replace(/<all_urls>/g, '').trim()
    return SENSITIVE_PERMISSIONS.includes(key)
  })
}

export interface LocalExtension {
  chromeId: string
  name: string
  version: string
  description: string
  developerName: string
  manifest: any
  allPermissions: string[]
}

export function calculateRiskFromManifest(manifest: any): { score: number; level: string } {
  const perms = manifest.permissions || []
  const hostPerms = manifest.host_permissions || []
  let score = 0

  const criticalPerms = ['cookies', 'webRequest', 'webRequestBlocking', 'proxy', 'debugger', 'nativeMessaging', 'management', 'privacy']
  const highPerms = ['tabs', 'webNavigation', 'history', 'bookmarks', 'downloads', 'system', 'scripting', 'identity', 'clipboardRead']
  const mediumPerms = ['storage', 'notifications', 'alarms', 'contextMenus', 'declarativeNetRequest']

  const criticalCount = perms.filter((p: string) => criticalPerms.includes(p)).length
  const highCount = perms.filter((p: string) => highPerms.includes(p)).length
  const mediumCount = perms.filter((p: string) => mediumPerms.includes(p)).length

  score += criticalCount * 12
  score += highCount * 7
  score += mediumCount * 3

  if (hostPerms.includes('<all_urls>')) {
    score += 20
  } else if (hostPerms.length > 3) {
    score += 10
  }

  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    score += 5
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

export async function scanLocalExtensions(): Promise<LocalExtension[] | null> {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')

    const homeDir = os.homedir()
    const chromePath = path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Extensions')

    if (!fs.existsSync(chromePath)) {
      return null
    }

    const extensionDirs = fs.readdirSync(chromePath).filter(name => {
      const fullPath = path.join(chromePath, name)
      return fs.statSync(fullPath).isDirectory()
    })

    const results: LocalExtension[] = []

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

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

      const name = resolveI18nValue(manifest, 'name')
      const description = resolveI18nValue(manifest, 'description')
      const version = manifest.version || 'unknown'
      const developerName = typeof manifest.author === 'string'
        ? manifest.author
        : manifest.author?.email || manifest.author?.name || `Developer (${chromeId.substring(0, 8)}...)`

      const allPermissions = [
        ...(manifest.permissions || []),
        ...(manifest.host_permissions || [])
      ]

      results.push({
        chromeId,
        name,
        version,
        description,
        developerName,
        manifest,
        allPermissions,
      })
    }

    return results
  } catch {
    return null
  }
}
