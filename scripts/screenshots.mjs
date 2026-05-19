import puppeteer from 'puppeteer'
import * as path from 'path'
import * as fs from 'fs'

const outputDir = path.join(process.cwd(), 'public', 'screenshots')

async function screenshot() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // Dashboard screenshot
  console.log('Capturing dashboard...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 })
  await page.waitForSelector('table', { timeout: 10000 })
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({
    path: path.join(outputDir, 'dashboard.png'),
    fullPage: false
  })
  console.log('  → dashboard.png')

  // Click on first extension to get detail page
  console.log('Capturing extension detail...')
  const firstLink = await page.$('a[href^="/extensions/"]')
  if (firstLink) {
    await firstLink.click()
    await page.waitForSelector('h1', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 1000))
    await page.screenshot({
      path: path.join(outputDir, 'detail.png'),
      fullPage: false
    })
    console.log('  → detail.png')
  }

  // Go back and filter to critical
  console.log('Capturing critical filters...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 })
  await page.waitForSelector('select', { timeout: 10000 })
  await page.select('select', 'critical')
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({
    path: path.join(outputDir, 'critical.png'),
    fullPage: false
  })
  console.log('  → critical.png')

  await browser.close()
  console.log('Done! Screenshots saved to public/screenshots/')
}

screenshot().catch(err => {
  console.error('Screenshot failed:', err)
  process.exit(1)
})
