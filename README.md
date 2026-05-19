# Plugpass 🔒

> **AI plugins have access to your passwords, emails, and browsing history. You can't tell which ones are safe. Plugpass fixes that.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io/)

---

## The Problem

Thousands of AI extensions now sit inside browsers with access to sensitive data. They range from funded companies with security teams to solo builders shipping from a laptop. **The permission model treats them identically**, and users have no way to tell the difference before clicking "Add to Chrome."

A single rogue extension breach costs more than years of prevention.

## How Plugpass Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        Plugpass Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SCAN          2. SCORE           3. RECOMMEND              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Download │    │  Permission  │    │  "This YouTube tool  │  │
│  │   .crx   │───▶│  Sensitivity │───▶│   needs <all_urls>?  │  │
│  │  file    │    │  + Developer │    │   Here's why that's  │  │
│  │          │    │  + Policy    │    │   dangerous..."       │  │
│  └──────────┘    └──────────────┘    └──────────────────────┘  │
│       │                   │                    │                │
│       ▼                   ▼                    ▼                │
│  Real manifest      Risk score 0-100    Actionable advice      │
│  data extraction    with breakdown      per extension          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What Makes It Different

| Traditional | Plugpass |
|---|---|
| Raw permission list | **Context-aware risk score** |
| "This extension needs cookies" | **"This YouTube tool shouldn't need your login cookies"** |
| One-size-fits-all warnings | **Category-specific expectations** |
| No developer context | **Trust badges from identity verification** |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/plugpass.git
cd plugpass
npm install

# 2. Set up database with demo data
npm run db:setup

# 3. (Optional) Import your own Chrome extensions
npm run db:import-local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see your scanned extensions with risk scores.

## Real Risk Scores

Here's what Plugpass found scanning real Chrome extensions:

| Extension | Category | Risk Score | Key Finding |
|---|---|---|---|
| **vidIQ Vision for YouTube** | YouTube Analytics | **76/100** 🔴 | Requests `<all_urls>` but only works on YouTube |
| **Malwarebytes Browser Guard** | Security | **92/100** 🔴 | 14 permissions — 64% more than expected for security |
| **Urban VPN Proxy** | VPN | **91/100** 🔴 | Full network interception + all-site access |
| **Free VPN - VeePN** | VPN | **100/100** 🔴 | Maximum possible risk — proxy + cookies + all URLs |
| **uBlock Origin Lite** | Ad Blocker | **36/100** 🟡 | High permissions justified for ad blocking |
| **Google Docs Offline** | Productivity | **9/100** 🟢 | Minimal, expected permissions |
| **WebSync for NotebookLM** | AI Notes | **13/100** 🟢 | Narrow host scope, few permissions |

## Risk Score Breakdown

Every score is calculated from **four weighted components**:

```
┌──────────────────────────────────────────────────────┐
│              vidIQ Vision — 76/100                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Permission Breadth    ████████████████░░░░  30 pts  │
│  (6 permissions × 5)                                 │
│                                                      │
│  Sensitivity           ████████████████████  35 pts  │
│  (cookies=critical, +high perms)                     │
│                                                      │
│  Developer Trust       ████████████████████  25 pts  │
│  (unverified developer)                              │
│                                                      │
│  Privacy Policy        ░░░░░░░░░░░░░░░░░░░░   0 pts  │
│  (has privacy policy)                                │
│                                                      │
│  Policy Delta          ░░░░░░░░░░░░░░░░░░░░   0 pts  │
│  (no behavioral data yet)                            │
│                                                      │
│  TOTAL: 76/100 → CRITICAL                            │
└──────────────────────────────────────────────────────┘
```

## Actionable Recommendations

Plugpass doesn't just give you a number — it tells you **what to do about it**:

```
⚠ [CRITICAL] Excessive website access
   This YouTube analytics extension requests access to ALL websites
   you visit, but it should only need one or two specific websites.
   → Consider removing or finding an alternative with narrower permissions

⚠ [CRITICAL] Access to all login sessions
   This extension can read your cookies, including authentication
   tokens for every website you're logged into.
   → Only grant cookie access to extensions you fully trust

⚠ [HIGH] Unnecessary permission: cookies
   Can read all your login cookies and session tokens
   → A YouTube analytics extension should not need "cookies" to function

ℹ [MEDIUM] 50% more permissions than expected
   This extension has 6 permissions. A typical YouTube analytics
   extension needs about 3.

⚠ [MEDIUM] Developer identity not verified
   → Research the developer before installing
```

## Architecture

```
src/
├── app/                    # Next.js 16 App Router
│   ├── page.tsx            # Dashboard with scan UI
│   ├── extensions/[id]/    # Detail page with recommendations
│   ├── developers/         # Developer trust registry
│   └── api/                # REST API routes
│       ├── extensions/     # List & detail endpoints
│       ├── scan/           # CRX3 download & parse
│       └── developers/     # Registry endpoint
│
├── lib/
│   ├── scanner.ts          # Downloads .crx from Google's update API,
│   │                       # strips CRX3 header, extracts manifest.json
│   │
│   ├── scorer.ts           # 4-component risk scoring engine:
│   │                       #   Permission breadth (max 40)
│   │                       #   Sensitivity weight (max 35)
│   │                       #   Developer trust (5-25)
│   │                       #   Privacy policy (0-15)
│   │
│   ├── recommendations.ts  # Category-aware recommendation engine:
│   │                       #   13 extension categories with expected
│   │                       #   permission footprints
│   │                       #   Compares actual vs expected permissions
│   │                       #   Generates actionable advice
│   │
│   └── registry.ts         # Developer identity verification:
│                           #   GitHub, LinkedIn, website signals
│                           #   Trust badge calculation
│
└── scripts/
    ├── seed.ts             # 8 demo extensions with real data
    └── import-local.ts     # Scans YOUR Chrome extensions directory
```

## Key Features

### 📡 CRX3 Manifest Parser
Downloads the actual `.crx` file from Google's update API, strips the CRX3 header, and extracts `manifest.json` directly. No HTML scraping, no unreliable APIs — **real permission data**.

### 🎯 Category-Aware Recommendations
Classifies extensions into 13 categories (ad-blocker, VPN, YouTube analytics, AI writing, etc.) and compares their actual permissions against what each category *should* need.

### 📊 Risk Scoring Engine
Four-component scoring with transparent breakdown. Every point is traceable to a specific permission, developer signal, or policy gap.

### 🔄 Local Extension Importer
Reads your Chrome installation directory and imports every extension's real `manifest.json` — no network requests needed.

### 🛡️ Developer Trust Registry
Tracks developer identity signals (GitHub, LinkedIn, website) and assigns trust badges. Verified developers get lower risk scores.

## Tech Stack

- **Next.js 16** — App Router, server components, API routes
- **TypeScript** — Strict mode throughout
- **Prisma 7** — Type-safe database access with SQLite
- **Tailwind CSS** — Dark theme dashboard UI
- **Cheerio** — HTML parsing (fallback)
- **AdmZip** — CRX3/ZIP extraction

## Available Scripts

```bash
npm run dev              # Start dev server
npm run db:setup         # Reset database + seed demo data
npm run db:import-local  # Import your local Chrome extensions
npm run db:push          # Push schema to database
npm run lint             # Run ESLint
```

## Adding Extension Categories

Want Plugpass to recognize a new type of extension? Add it to `src/lib/recommendations.ts`:

```typescript
{
  category: 'your-category',
  keywords: ['keyword1', 'keyword2'],
  expectedPermissions: ['activeTab', 'storage'],
  maxHostScope: 'single',  // 'single' | 'limited' | 'all'
  expectedSensitivity: 'low',
}
```

The recommendation engine will immediately start generating category-aware advice for extensions matching those keywords.

## Roadmap

- [ ] **Batch audit report** — One-click scan of all local extensions with summary
- [ ] **Permission comparison** — Side-by-side comparison of alternatives
- [ ] **Chrome Web Store API** — Pull ratings, user counts, and review data
- [ ] **Privacy policy parser** — LLM-based analysis of actual privacy policies
- [ ] **Behavioral monitoring** — Track actual API calls from opt-in users
- [ ] **Browser extension** — Real-time risk score in the Chrome Web Store
- [ ] **Enterprise mode** — Org-wide scanning, compliance reports, audit logs

## Why Open Source?

The AI plugin ecosystem grew faster than any safety infrastructure could follow. **This shouldn't be a proprietary product** — it should be a public utility. Every developer should be able to:

- Audit their own extensions before publishing
- Compare their permission footprint against alternatives
- Earn trust badges through transparent verification

## License

MIT — do whatever you want with it.

---

**Built because the wrong extension shouldn't get caught at the door.**
