import puppeteer from 'puppeteer'
import GIFEncoder from 'gif-encoder-2'
import { createCanvas, loadImage } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

const outputDir = path.join(process.cwd(), 'public', 'screenshots')
const outputPath = path.join(outputDir, 'demo.gif')

async function createDemoGIF() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 720 })

  // Navigate to dashboard
  console.log('Loading dashboard...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 })
  await page.waitForSelector('table', { timeout: 10000 })

  // Wait for animations to settle
  await new Promise(r => setTimeout(r, 500))

  // Capture frames for GIF
  const framePaths = []
  const delay = 800 // ms between frames

  // Frame 1: Dashboard overview
  console.log('Frame 1: Dashboard')
  const frame1Path = path.join(outputDir, 'frame1.png')
  await page.screenshot({ path: frame1Path, fullPage: false })
  framePaths.push(frame1Path)
  await new Promise(r => setTimeout(r, delay))

  // Frame 2: Type extension ID
  console.log('Frame 2: Typing ID...')
  await page.focus('input[placeholder="Chrome extension ID"]')
  await page.type('input[placeholder="Chrome extension ID"]', 'pachckjkecffpdphbpmfolblodfkgbhl', { delay: 50 })
  await new Promise(r => setTimeout(r, delay))
  const frame2Path = path.join(outputDir, 'frame2.png')
  await page.screenshot({ path: frame2Path, fullPage: false })
  framePaths.push(frame2Path)

  // Frame 3: Click scan
  console.log('Frame 3: Scanning...')
  const scanButton = await page.$('button:not(:disabled)')
  if (scanButton) {
    await scanButton.click()
  }
  await new Promise(r => setTimeout(r, 1500))
  const frame3Path = path.join(outputDir, 'frame3.png')
  await page.screenshot({ path: frame3Path, fullPage: false })
  framePaths.push(frame3Path)

  // Frame 4: Result appears
  console.log('Frame 4: Result')
  await page.waitForSelector('div[class*="bg-emerald-500/10"]', { timeout: 10000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 500))
  const frame4Path = path.join(outputDir, 'frame4.png')
  await page.screenshot({ path: frame4Path, fullPage: false })
  framePaths.push(frame4Path)

  // Frame 5: Click on first extension
  console.log('Frame 5: Extension detail')
  const firstLink = await page.$('a[href^="/extensions/"]')
  if (firstLink) {
    await firstLink.click()
    await page.waitForSelector('h1', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 500))
    const frame5Path = path.join(outputDir, 'frame5.png')
    await page.screenshot({ path: frame5Path, fullPage: false })
    framePaths.push(frame5Path)
  }

  // Frame 6: Scroll to recommendations
  console.log('Frame 6: Recommendations')
  await page.evaluate(() => window.scrollTo(0, 400))
  await new Promise(r => setTimeout(r, 500))
  const frame6Path = path.join(outputDir, 'frame6.png')
  await page.screenshot({ path: frame6Path, fullPage: false })
  framePaths.push(frame6Path)

  await browser.close()

  // Create GIF from frames
  console.log('Generating GIF...')
  const width = 1280
  const height = 720
  const encoder = new GIFEncoder(width, height, 'neuquant')
  encoder.createReadStream().pipe(fs.createWriteStream(outputPath))
  encoder.start()
  encoder.setRepeat(0)
  encoder.setDelay(1000)
  encoder.setQuality(10)

  for (const framePath of framePaths) {
    if (fs.existsSync(framePath)) {
      const img = await loadImage(framePath)
      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      encoder.addFrame(ctx)
      console.log(`  Added ${path.basename(framePath)}`)
    }
  }

  encoder.finish()
  
  // Wait for finish
  await new Promise((resolve) => {
    encoder.on('finished', () => {
      resolve()
    })
  })
  
  // Clean up frame files
  for (const framePath of framePaths) {
    if (fs.existsSync(framePath)) {
      fs.unlinkSync(framePath)
    }
  }

  const stats = fs.statSync(outputPath)
  console.log(`GIF saved to ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
}

createDemoGIF().catch(err => {
  console.error('GIF creation failed:', err)
  process.exit(1)
})
