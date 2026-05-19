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

function extractManifestFromCrx(crxBuffer: Buffer): any {
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
  return JSON.parse(manifestJson)
}

function resolveI18nValue(manifest: any, key: string, zip: AdmZip | null = null): string {
  const raw = manifest[key] || ''
  if (!raw.startsWith('__MSG_')) return raw

  const msgKey = raw.replace('__MSG_', '').replace('__', '')
  const locale = manifest.default_locale || 'en'

  if (zip) {
    const localeEntry = zip.getEntry(`_locales/${locale}/messages.json`)
    if (localeEntry) {
      try {
        const messages = JSON.parse(localeEntry.getData().toString('utf8'))
        if (messages[msgKey]?.message) return messages[msgKey].message
      } catch {}
    }

    if (locale !== 'en') {
      const enEntry = zip.getEntry('_locales/en/messages.json')
      if (enEntry) {
        try {
          const messages = JSON.parse(enEntry.getData().toString('utf8'))
          if (messages[msgKey]?.message) return messages[msgKey].message
        } catch {}
      }
    }
  }

  return raw
}

export async function scanExtension(chromeId: string): Promise<ScannedExtension | null> {
  try {
    const crxBuffer = await downloadCrx(chromeId)
    const manifest = extractManifestFromCrx(crxBuffer)

    const name = resolveI18nValue(manifest, 'name')
    const description = resolveI18nValue(manifest, 'description')
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
