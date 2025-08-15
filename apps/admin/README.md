# NetProphet Admin

This is the admin interface for the NetProphet application, built with Next.js and Supabase.

## Setup

### 1. Environment Variables

The admin app requires Supabase environment variables to function properly. Create a `.env.local` file in the root directory of the project (not in the admin app directory) with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can copy the `env.example` file from the root directory and fill in your actual Supabase credentials.

### 2. Start Development

```bash
# From the root directory
pnpm dev

# Or specifically for admin
pnpm --filter=@netprophet/admin dev
```

## Features

- **Player Management**: Create, edit, and delete players
- **Tournament Management**: Create tournaments with categories
- **Match Management**: Schedule matches with automatic odds calculation
- **User Management**: View and manage user accounts
- **Betting Management**: Monitor and manage betting activity

## Troubleshooting

### Players Not Loading

If you see "Failed to load players" in the MatchForm, check that:

1. Your `.env.local` file exists in the root directory
2. The Supabase environment variables are correctly set
3. Your Supabase project is running and accessible
4. The players table exists in your database

### Time Synchronization Issues

The MatchForm automatically calculates lock times (20 minutes before start time). If you experience time synchronization issues:

1. Make sure you're using the latest version of the form
2. Check that your browser's timezone settings are correct
3. The lock time is automatically calculated and cannot be manually edited

## Development

The admin app uses:

- Next.js 15
- TypeScript
- Tailwind CSS
- Radix UI components
- Supabase for backend
