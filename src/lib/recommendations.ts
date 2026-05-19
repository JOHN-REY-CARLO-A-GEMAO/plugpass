export interface Recommendation {
  type: 'warning' | 'info' | 'positive'
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  actionable: boolean
  action?: string
}

export interface CategoryProfile {
  category: string
  keywords: string[]
  expectedPermissions: string[]
  maxHostScope: 'single' | 'limited' | 'all'
  expectedSensitivity: 'low' | 'medium' | 'high'
}

const CATEGORY_PROFILES: CategoryProfile[] = [
  {
    category: 'ad-blocker',
    keywords: ['adblock', 'ad block', 'adblocker', 'ad blocker', 'ublock', 'adguard', 'block ads', 'no ads'],
    expectedPermissions: ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'declarativeNetRequestFeedback', 'storage', 'tabs'],
    maxHostScope: 'all',
    expectedSensitivity: 'high',
  },
  {
    category: 'youtube-analytics',
    keywords: ['vidiq', 'vid iq', 'vidiq vision', 'tube buddy', 'tubebuddy', 'youtube analytics', 'youtube studio', 'youtube stats', 'youtube seo'],
    expectedPermissions: ['activeTab', 'storage', 'scripting'],
    maxHostScope: 'single',
    expectedSensitivity: 'low',
  },
  {
    category: 'vpn-proxy',
    keywords: ['vpn', 'proxy', 'unblock', 'geo', 'location', 'ip changer', 'anonymous', 'bypass'],
    expectedPermissions: ['proxy', 'storage', 'tabs', 'webRequest', 'webNavigation'],
    maxHostScope: 'all',
    expectedSensitivity: 'high',
  },
  {
    category: 'password-manager',
    keywords: ['password', 'lastpass', 'bitwarden', '1password', 'keeper', 'dashlane', 'nordpass', 'autofill'],
    expectedPermissions: ['activeTab', 'storage', 'contextMenus', 'unlimitedStorage'],
    maxHostScope: 'limited',
    expectedSensitivity: 'medium',
  },
  {
    category: 'ai-writing',
    keywords: ['grammarly', 'grammar', 'writing', 'spell check', 'spellcheck', 'paraphrase', 'rephrase', 'ai writing', 'ai assistant', 'compose', 'email assistant'],
    expectedPermissions: ['activeTab', 'storage'],
    maxHostScope: 'single',
    expectedSensitivity: 'low',
  },
  {
    category: 'translation',
    keywords: ['translate', 'translation', 'language', 'speak', 'subtitle', 'subtitles', 'caption', 'captions'],
    expectedPermissions: ['activeTab', 'storage', 'contextMenus'],
    maxHostScope: 'limited',
    expectedSensitivity: 'low',
  },
  {
    category: 'security',
    keywords: ['malware', 'antivirus', 'security', 'guard', 'protect', 'safe browsing', 'phishing', 'tracker', 'privacy guard'],
    expectedPermissions: ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'storage', 'tabs', 'webNavigation'],
    maxHostScope: 'all',
    expectedSensitivity: 'high',
  },
  {
    category: 'productivity',
    keywords: ['scheduler', 'calendar', 'meeting', 'task', 'todo', 'notion', 'todoist', 'trello', 'asana', 'clickup'],
    expectedPermissions: ['activeTab', 'storage', 'notifications', 'identity'],
    maxHostScope: 'single',
    expectedSensitivity: 'low',
  },
  {
    category: 'social-media',
    keywords: ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'social', 'followers', 'friends', 'groups', 'requests', 'manager'],
    expectedPermissions: ['activeTab', 'storage'],
    maxHostScope: 'single',
    expectedSensitivity: 'low',
  },
  {
    category: 'developer-tool',
    keywords: ['devtools', 'debug', 'inspector', 'lighthouse', 'web vitals', 'api', 'json', 'formatter', 'beautifier', 'code', 'mentor'],
    expectedPermissions: ['activeTab', 'storage', 'scripting'],
    maxHostScope: 'limited',
    expectedSensitivity: 'low',
  },
  {
    category: 'download-manager',
    keywords: ['download', 'downloader', 'video download', 'save', 'grabber', 'batch download'],
    expectedPermissions: ['downloads', 'storage', 'activeTab', 'tabs'],
    maxHostScope: 'limited',
    expectedSensitivity: 'medium',
  },
  {
    category: 'tab-manager',
    keywords: ['tab manager', 'tab groups', 'session', 'workspace', 'tab suspender', 'sleeping tabs'],
    expectedPermissions: ['tabs', 'storage', 'tabGroups'],
    maxHostScope: 'all',
    expectedSensitivity: 'medium',
  },
  {
    category: 'notebook-ai',
    keywords: ['notebooklm', 'notebook', 'ai notes', 'summarize', 'summarizer', 'summary', 'web summary'],
    expectedPermissions: ['activeTab', 'storage', 'scripting'],
    maxHostScope: 'single',
    expectedSensitivity: 'low',
  },
]

export function classifyExtension(name: string, description: string, permissions: string[]): { category: string; confidence: number } {
  const text = `${name} ${description}`.toLowerCase()

  let bestMatch: { category: string; score: number } = { category: 'unknown', score: 0 }

  for (const profile of CATEGORY_PROFILES) {
    let score = 0
    for (const keyword of profile.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 2
      }
    }

    const permOverlap = profile.expectedPermissions.filter(p => permissions.includes(p)).length
    const permTotal = profile.expectedPermissions.length
    if (permTotal > 0) {
      score += (permOverlap / permTotal) * 1
    }

    if (score > bestMatch.score) {
      bestMatch = { category: profile.category, score }
    }
  }

  const confidence = bestMatch.score >= 3 ? 0.9 : bestMatch.score >= 2 ? 0.7 : bestMatch.score >= 1 ? 0.5 : 0.2

  return {
    category: bestMatch.category,
    confidence,
  }
}

export function getCategoryProfile(category: string): CategoryProfile | null {
  return CATEGORY_PROFILES.find(p => p.category === category) || null
}

export function generateRecommendations(
  name: string,
  description: string,
  permissions: string[],
  hostPermissions: string[],
  developerTrust: string,
  hasPrivacyPolicy: boolean
): Recommendation[] {
  const { category, confidence } = classifyExtension(name, description, permissions)
  const profile = getCategoryProfile(category)
  const recommendations: Recommendation[] = []

  const hasAllUrls = hostPermissions.includes('<all_urls>')
  const hostCount = hostPermissions.filter(p => p !== '<all_urls>').length

  if (profile && confidence >= 0.5) {
    if (hasAllUrls && profile.maxHostScope !== 'all') {
      const expectedHosts = profile.maxHostScope === 'single' ? 'one or two specific websites' : 'a limited set of websites'
      recommendations.push({
        type: 'warning',
        title: 'Excessive website access',
        description: `This ${category.replace('-', ' ')} extension requests access to ALL websites you visit, but it should only need ${expectedHosts}. This means it can read and modify data on every site you browse.`,
        severity: 'critical',
        actionable: true,
        action: 'Consider removing this extension or finding an alternative with narrower host permissions',
      })
    } else if (hostCount > 5 && profile.maxHostScope === 'single') {
      recommendations.push({
        type: 'warning',
        title: 'More website access than needed',
        description: `This extension has access to ${hostCount} website patterns, but as a ${category.replace('-', ' ')} tool it likely only needs access to its own service.`,
        severity: 'high',
        actionable: true,
        action: 'Review if all these host permissions are necessary for the extension to function',
      })
    }

    const unexpectedPerms = permissions.filter(p => !profile.expectedPermissions.includes(p))
    const criticalUnexpected = unexpectedPerms.filter(p =>
      ['cookies', 'webRequest', 'webRequestBlocking', 'proxy', 'debugger', 'nativeMessaging', 'management', 'history', 'bookmarks', 'clipboardRead'].includes(p)
    )

    if (criticalUnexpected.length > 0) {
      const permDescriptions: Record<string, string> = {
        cookies: 'Can read all your login cookies and session tokens',
        webRequest: 'Can intercept and modify all network requests',
        webRequestBlocking: 'Can block any website from loading',
        proxy: 'Can route all your traffic through a different server',
        debugger: 'Can debug and inspect any browser tab',
        nativeMessaging: 'Can communicate with programs installed on your computer',
        management: 'Can view, enable, or disable your other extensions',
        history: 'Can read your entire browsing history',
        bookmarks: 'Can read and modify your bookmarks',
        clipboardRead: 'Can read anything you copy to your clipboard',
      }

      for (const perm of criticalUnexpected) {
        recommendations.push({
          type: 'warning',
          title: `Unnecessary permission: ${perm}`,
          description: permDescriptions[perm] || `This permission is not expected for a ${category.replace('-', ' ')} extension`,
          severity: 'high',
          actionable: true,
          action: `A ${category.replace('-', ' ')} extension should not need "${perm}" to function`,
        })
      }
    }

    const excessCount = unexpectedPerms.length
    if (excessCount > 3) {
      const totalExpected = profile.expectedPermissions.length
      const totalActual = permissions.length
      const excess = totalActual - totalExpected
      const pct = Math.round((excess / totalActual) * 100)
      recommendations.push({
        type: 'info',
        title: `${pct}% more permissions than expected`,
        description: `This extension has ${totalActual} permissions. A typical ${category.replace('-', ' ')} extension needs about ${totalExpected}.`,
        severity: 'medium',
        actionable: false,
      })
    }
  }

  if (permissions.includes('cookies') && category !== 'password-manager' && category !== 'security') {
    recommendations.push({
      type: 'warning',
      title: 'Access to all login sessions',
      description: 'This extension can read your cookies, which includes authentication tokens for every website you\'re logged into. A breach of this extension could compromise all your accounts.',
      severity: 'critical',
      actionable: true,
      action: 'Only grant cookie access to extensions you fully trust, like password managers',
    })
  }

  if (permissions.includes('webRequest') || permissions.includes('webRequestBlocking')) {
    recommendations.push({
      type: 'warning',
      title: 'Can intercept all network traffic',
      description: 'This extension can see, modify, or block every request your browser makes. This includes API calls, form submissions, and authentication requests.',
      severity: 'high',
      actionable: false,
    })
  }

  if (permissions.includes('nativeMessaging')) {
    recommendations.push({
      type: 'warning',
      title: 'Can communicate with local programs',
      description: 'This extension can send data to and receive data from programs installed on your computer. This is a powerful capability that most extensions don\'t need.',
      severity: 'high',
      actionable: true,
      action: 'Verify that this extension requires a companion desktop application',
    })
  }

  if (developerTrust === 'unverified') {
    recommendations.push({
      type: 'warning',
      title: 'Developer identity not verified',
      description: 'The developer has not linked a GitHub, LinkedIn, or company website. This makes it harder to hold them accountable if something goes wrong.',
      severity: 'medium',
      actionable: true,
      action: 'Research the developer before installing. Look for reviews, a company website, or open-source code.',
    })
  }

  if (!hasPrivacyPolicy) {
    recommendations.push({
      type: 'warning',
      title: 'No privacy policy found',
      description: 'This extension doesn\'t provide a privacy policy, so there\'s no documented commitment to how your data is handled.',
      severity: 'medium',
      actionable: true,
      action: 'Avoid installing extensions without a privacy policy, especially those with sensitive permissions',
    })
  }

  if (permissions.includes('history')) {
    recommendations.push({
      type: 'warning',
      title: 'Can read your browsing history',
      description: 'This extension has access to your complete browsing history, including sites you\'ve visited, when, and how often.',
      severity: 'high',
      actionable: true,
      action: 'Only allow history access if the extension\'s core feature requires it (e.g., history-based search)',
    })
  }

  if (hostPermissions.length === 0 && !hasAllUrls && permissions.length <= 2) {
    recommendations.push({
      type: 'positive',
      title: 'Minimal permission footprint',
      description: 'This extension requests very few permissions and doesn\'t access any websites directly. This is a good sign.',
      severity: 'low',
      actionable: false,
    })
  }

  if (category !== 'unknown' && confidence >= 0.7) {
    const expectedPerms = profile?.expectedPermissions || []
    const hasExpected = expectedPerms.every(p => permissions.includes(p))
    if (hasExpected && permissions.length === expectedPerms.length) {
      recommendations.push({
        type: 'positive',
        title: 'Permissions match expected footprint',
        description: `This extension's permissions align with what we expect for a ${category.replace('-', ' ')}. No unnecessary permissions detected.`,
        severity: 'low',
        actionable: false,
      })
    }
  }

  recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return recommendations
}
