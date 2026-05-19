# Contributing to Plugpass

Thank you for your interest in contributing! Plugpass is an open-source AI plugin trust registry.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/plugpass.git`
3. Install dependencies: `npm install`
4. Set up the database: `npm run db:setup`
5. Start the dev server: `npm run dev`

## Project Structure

```
plugpass/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   ├── lib/              # Core modules
│   │   ├── scanner.ts        # CRX3 manifest parser
│   │   ├── scorer.ts         # Risk scoring engine
│   │   ├── recommendations.ts # Actionable recommendation engine
│   │   ├── registry.ts       # Developer trust registry
│   │   └── db.ts             # Prisma client
│   └── components/       # React components
├── prisma/
│   └── schema.prisma     # Database schema
└── scripts/
    ├── seed.ts           # Demo data seeder
    └── import-local.ts   # Local Chrome extension importer
```

## Adding New Features

### Adding a new extension category

Edit `src/lib/recommendations.ts` and add to `CATEGORY_PROFILES`:

```typescript
{
  category: 'your-category',
  keywords: ['keyword1', 'keyword2'],
  expectedPermissions: ['activeTab', 'storage'],
  maxHostScope: 'single',
  expectedSensitivity: 'low',
}
```

### Adding a new permission type

Edit `src/lib/scanner.ts` and add to `DATA_PERMISSIONS`:

```typescript
newPermission: { category: 'category', sensitivity: 'low', description: 'What it does' }
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `npm run lint` to check for issues
4. Commit with a descriptive message
5. Push and open a PR

## Code Style

- TypeScript strict mode
- No comments unless explaining complex logic
- Follow existing patterns in the codebase
- Use Tailwind CSS for styling

## Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected vs actual behavior
- Your OS and Node.js version
- Screenshots if applicable

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
