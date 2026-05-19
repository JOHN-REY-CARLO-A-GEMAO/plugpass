import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const AI_EXTENSIONS = [
  {
    chromeId: 'ai-companion-001',
    name: 'AI Writing Assistant Pro',
    version: '3.2.1',
    description: 'AI-powered writing assistant that helps you compose emails, documents, and more',
    developer: 'GrammarTech Inc',
    developerGithub: 'https://github.com/grammartech',
    developerLinkedin: 'https://linkedin.com/company/grammartech',
    developerWebsite: 'https://grammartech.io',
    privacyPolicy: 'https://grammartech.io/privacy',
    riskScore: 22,
    riskLevel: 'low',
    permissions: [
      { name: 'activeTab', category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'notifications', category: 'system', sensitivity: 'low', description: 'Display notifications' },
    ],
    pathways: [
      { apiEndpoint: 'api.grammartech.io/v1/analyze', dataType: 'text', direction: 'outbound', policyClaim: 'Text only, no PII', actualBehavior: 'Text only, no PII', policyDelta: 0 },
    ],
  },
  {
    chromeId: 'ai-companion-002',
    name: 'SmartReply AI',
    version: '2.0.4',
    description: 'Auto-generate email replies using AI directly in Gmail',
    developer: 'ReplyAI Labs',
    developerGithub: 'https://github.com/replyai',
    developerWebsite: 'https://replyai.dev',
    privacyPolicy: 'https://replyai.dev/privacy',
    riskScore: 35,
    riskLevel: 'medium',
    permissions: [
      { name: 'activeTab', category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'cookies', category: 'authentication', sensitivity: 'critical', description: 'Read and modify all cookies' },
      { name: 'webRequest', category: 'network', sensitivity: 'high', description: 'Intercept and modify network requests' },
    ],
    pathways: [
      { apiEndpoint: 'api.replyai.dev/v1/reply', dataType: 'email content', direction: 'outbound', policyClaim: 'Email content only', actualBehavior: 'Email + metadata', policyDelta: 15 },
    ],
  },
  {
    chromeId: 'ai-companion-003',
    name: 'TabSense AI',
    version: '1.5.0',
    description: 'Summarize any webpage with one click using advanced AI',
    developer: 'SoloDev_Mike',
    privacyPolicy: null,
    riskScore: 68,
    riskLevel: 'high',
    permissions: [
      { name: 'tabs', category: 'browsing', sensitivity: 'high', description: 'Access to all browser tabs and URLs' },
      { name: 'webNavigation', category: 'browsing', sensitivity: 'high', description: 'Track navigation across all frames' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'history', category: 'browsing', sensitivity: 'high', description: 'Read and modify browsing history' },
      { name: 'scripting', category: 'system', sensitivity: 'high', description: 'Execute scripts in web pages' },
      { name: 'activeTab', category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
    ],
    pathways: [
      { apiEndpoint: 'api.tabsense.ai/v1/summarize', dataType: 'page content', direction: 'outbound', policyClaim: 'Page content only', actualBehavior: 'Page content + URL history', policyDelta: 35 },
    ],
  },
  {
    chromeId: 'ai-companion-004',
    name: 'DataHarvester AI',
    version: '4.1.0',
    description: 'Extract and organize data from any website using AI',
    developer: 'ShadowSoft LLC',
    riskScore: 89,
    riskLevel: 'critical',
    permissions: [
      { name: 'tabs', category: 'browsing', sensitivity: 'high', description: 'Access to all browser tabs and URLs' },
      { name: 'webNavigation', category: 'browsing', sensitivity: 'high', description: 'Track navigation across all frames' },
      { name: 'webRequest', category: 'network', sensitivity: 'high', description: 'Intercept and modify network requests' },
      { name: 'webRequestBlocking', category: 'network', sensitivity: 'critical', description: 'Block and modify network requests' },
      { name: 'cookies', category: 'authentication', sensitivity: 'critical', description: 'Read and modify all cookies' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'history', category: 'browsing', sensitivity: 'high', description: 'Read and modify browsing history' },
      { name: 'bookmarks', category: 'data', sensitivity: 'medium', description: 'Read and modify bookmarks' },
      { name: 'downloads', category: 'data', sensitivity: 'medium', description: 'Manage downloads' },
      { name: 'management', category: 'system', sensitivity: 'high', description: 'Manage other extensions' },
      { name: 'clipboardRead', category: 'data', sensitivity: 'high', description: 'Read clipboard contents' },
      { name: 'nativeMessaging', category: 'system', sensitivity: 'critical', description: 'Communicate with native applications' },
    ],
    pathways: [
      { apiEndpoint: 'api.shadowsoft.net/v1/extract', dataType: 'all page data', direction: 'outbound', policyClaim: 'User-selected data only', actualBehavior: 'All visited page data', policyDelta: 80 },
      { apiEndpoint: 'analytics.shadowsoft.net/track', dataType: 'browsing behavior', direction: 'outbound', policyClaim: 'Not collected', actualBehavior: 'Full browsing patterns', policyDelta: 100 },
    ],
  },
  {
    chromeId: 'ai-companion-005',
    name: 'CodeMentor AI',
    version: '2.3.0',
    description: 'AI code review and suggestions for GitHub and GitLab',
    developer: 'DevTools United',
    developerGithub: 'https://github.com/devtoolsunited',
    developerLinkedin: 'https://linkedin.com/company/devtoolsunited',
    developerWebsite: 'https://devtoolsunited.com',
    privacyPolicy: 'https://devtoolsunited.com/privacy',
    riskScore: 18,
    riskLevel: 'low',
    permissions: [
      { name: 'activeTab', category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
    ],
    pathways: [
      { apiEndpoint: 'api.devtoolsunited.com/v1/review', dataType: 'code snippets', direction: 'outbound', policyClaim: 'Code only, no credentials', actualBehavior: 'Code only, no credentials', policyDelta: 0 },
    ],
  },
  {
    chromeId: 'ai-companion-006',
    name: 'EmailGenius AI',
    version: '5.0.2',
    description: 'Compose professional emails with AI assistance',
    developer: 'ProductivityAI Corp',
    developerGithub: 'https://github.com/productivityai',
    developerWebsite: 'https://productivityai.com',
    privacyPolicy: 'https://productivityai.com/privacy',
    riskScore: 28,
    riskLevel: 'medium',
    permissions: [
      { name: 'activeTab', category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'identity', category: 'authentication', sensitivity: 'high', description: 'Access Google identity' },
      { name: 'clipboardWrite', category: 'data', sensitivity: 'medium', description: 'Write to clipboard' },
    ],
    pathways: [
      { apiEndpoint: 'api.productivityai.com/v1/compose', dataType: 'email draft', direction: 'outbound', policyClaim: 'Draft content only', actualBehavior: 'Draft + contact names', policyDelta: 10 },
    ],
  },
  {
    chromeId: 'ai-companion-007',
    name: 'WebSummarizer Plus',
    version: '1.0.8',
    description: 'Quick AI summaries of articles and web pages',
    developer: 'QuickTools_Dev',
    privacyPolicy: 'https://quicktools.dev/privacy',
    riskScore: 42,
    riskLevel: 'medium',
    permissions: [
      { name: 'tabs', category: 'browsing', sensitivity: 'high', description: 'Access to all browser tabs and URLs' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'notifications', category: 'system', sensitivity: 'low', description: 'Display notifications' },
    ],
    pathways: [
      { apiEndpoint: 'api.quicktools.dev/v1/summarize', dataType: 'page content', direction: 'outbound', policyClaim: 'Active page only', actualBehavior: 'Active page + referrer', policyDelta: 20 },
    ],
  },
  {
    chromeId: 'ai-companion-008',
    name: 'AI Scheduler Bot',
    version: '3.0.0',
    description: 'AI-powered calendar and meeting scheduler',
    developer: 'ScheduleAI Inc',
    developerGithub: 'https://github.com/scheduleai',
    developerLinkedin: 'https://linkedin.com/company/scheduleai',
    developerWebsite: 'https://scheduleai.io',
    privacyPolicy: 'https://scheduleai.io/privacy',
    riskScore: 31,
    riskLevel: 'medium',
    permissions: [
      { name: 'activeTab', category: 'browsing', sensitivity: 'low', description: 'Access current tab on user action' },
      { name: 'storage', category: 'data', sensitivity: 'medium', description: 'Access browser storage' },
      { name: 'identity', category: 'authentication', sensitivity: 'high', description: 'Access Google identity' },
      { name: 'notifications', category: 'system', sensitivity: 'low', description: 'Display notifications' },
    ],
    pathways: [
      { apiEndpoint: 'api.scheduleai.io/v1/schedule', dataType: 'calendar events', direction: 'outbound', policyClaim: 'Calendar metadata only', actualBehavior: 'Calendar + email', policyDelta: 12 },
    ],
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Simple protection - only allow seeding with a secret
  if (secret !== process.env.SEED_SECRET || !process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Seeding production database...')

    // Clear existing data
    await prisma.alternative.deleteMany()
    await prisma.dataPathway.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.extension.deleteMany()
    await prisma.developer.deleteMany()

    const createdExtensions: Record<string, any> = {}

    for (const ext of AI_EXTENSIONS) {
      const devId = ext.developer.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      const developer = await prisma.developer.upsert({
        where: { id: devId },
        update: {},
        create: {
          id: devId,
          name: ext.developer,
          githubUrl: ext.developerGithub || null,
          linkedinUrl: ext.developerLinkedin || null,
          website: ext.developerWebsite || null,
          trustBadge: ext.developerGithub && ext.developerLinkedin ? 'verified' : ext.developerGithub ? 'partial' : 'none',
          verificationLevel: ext.developerGithub && ext.developerLinkedin ? 'full' : ext.developerGithub ? 'partial' : 'unverified',
        },
      })

      const extension = await prisma.extension.create({
        data: {
          chromeId: ext.chromeId,
          name: ext.name,
          version: ext.version,
          description: ext.description,
          storeUrl: 'https://chromewebstore.google.com/detail/' + ext.chromeId,
          privacyPolicyUrl: ext.privacyPolicy,
          developerId: developer.id,
          riskScore: ext.riskScore,
          riskLevel: ext.riskLevel,
          permissions: {
            create: ext.permissions,
          },
          dataPathways: {
            create: ext.pathways,
          },
        },
      })

      createdExtensions[ext.chromeId] = extension
    }

    // Create alternatives
    await prisma.alternative.create({
      data: {
        primaryId: createdExtensions['ai-companion-003'].id,
        alternativeId: createdExtensions['ai-companion-005'].id,
        reason: 'CodeMentor AI has 66% fewer permissions and a verified developer',
        permissionDelta: 4,
      },
    })

    await prisma.alternative.create({
      data: {
        primaryId: createdExtensions['ai-companion-004'].id,
        alternativeId: createdExtensions['ai-companion-001'].id,
        reason: 'AI Writing Assistant Pro requests 92% fewer permissions',
        permissionDelta: 10,
      },
    })

    await prisma.alternative.create({
      data: {
        primaryId: createdExtensions['ai-companion-004'].id,
        alternativeId: createdExtensions['ai-companion-005'].id,
        reason: 'CodeMentor AI has verified developer and minimal permissions',
        permissionDelta: 10,
      },
    })

    console.log('Seeded ' + AI_EXTENSIONS.length + ' extensions')

    return NextResponse.json({
      success: true,
      message: `Seeded ${AI_EXTENSIONS.length} extensions`,
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
