# NetProphet - Tennis Prediction Platform

A gamified tennis prediction platform built with Next.js, Expo, and Supabase. Predict tennis matches, compete with other players, and climb the leaderboard!

## 🏗️ Architecture

- **Web App**: Next.js 14 with App Router, Tailwind CSS, and shadcn/ui
- **Mobile App**: Expo with React Native 0.74 and Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Shared**: Turborepo monorepo with shared UI and utility packages
- **State Management**: TanStack Query + Zustand
- **Real-time**: Supabase Realtime subscriptions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase CLI
- Expo CLI (for mobile development)

### 1. Clone and Install

```bash
git clone <repository-url>
cd netprophet
pnpm install
```

### 2. Set up Supabase

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

### 3. Environment Variables

Create `.env.local` in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OneSignal (for mobile)
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_api_key

# Vercel (for deployment)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Expo (for mobile deployment)
EXPO_TOKEN=your_expo_token
```

### 4. Start Development

```bash
# Start all services (Supabase + Web + Mobile)
pnpm dev

# Or start individually:
pnpm --filter=@netprophet/web dev     # Web app
pnpm --filter=@netprophet/mobile start # Mobile app
```

## 📱 Features

### Web App
- ✅ Magic link authentication
- ✅ Real-time match updates
- ✅ Prediction form with optimistic UI
- ✅ Global leaderboard
- ✅ Responsive design

### Mobile App
- ✅ Deep link authentication
- ✅ Tab navigation (Matches, Leaderboard, Profile)
- ✅ Push notifications (OneSignal)
- ✅ Cross-platform UI components

### Backend
- ✅ PostgreSQL with Row Level Security
- ✅ Elo rating system
- ✅ Scheduled Edge Functions
- ✅ Real-time subscriptions

## 🏗️ Project Structure

```
netprophet/
├── apps/
│   ├── web/                 # Next.js web app
│   └── mobile/             # Expo mobile app
├── packages/
│   ├── ui/                 # Cross-platform UI components
│   ├── lib/                # Shared utilities & Supabase client
│   └── config/             # ESLint, Prettier, TS configs
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge Functions
├── .github/workflows/      # CI/CD pipelines
└── docs/                   # Documentation
```

## 🛠️ Development

### Available Scripts

```bash
# Root level
pnpm dev          # Start all apps in development
pnpm build        # Build all packages and apps
pnpm lint         # Lint all packages and apps
pnpm test         # Run tests
pnpm type-check   # Type check all packages

# Package specific
pnpm --filter=@netprophet/web dev
pnpm --filter=@netprophet/mobile start
pnpm --filter=@netprophet/ui storybook
```

### Database Schema

The platform uses the following main tables:

- **players**: Tennis players with Elo ratings
- **matches**: Tennis matches with scores and probabilities
- **predictions**: User predictions for matches
- **clubs**: Tennis clubs
- **app_users**: Public user view

### Elo Rating System

The Edge Function `update_elo` runs every hour to:
1. Process completed matches
2. Update player Elo ratings
3. Calculate match probabilities
4. Assign points based on odds

## 🚀 Deployment

### Web App (Vercel)

The web app automatically deploys to Vercel on pushes to main branch.

### Mobile App (EAS)

```bash
# Build for production
cd apps/mobile
eas build --platform all

# Submit to stores
eas submit --platform all
```

### Supabase

```bash
# Deploy to production
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details. 