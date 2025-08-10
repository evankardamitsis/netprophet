# Deployment Guide

This project is set up for separate Vercel deployments for the web and admin apps using Turborepo best practices.

## Setup Instructions

### 1. Web App Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Set the following configuration:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm run build --filter=@netprophet/web`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

### 2. Admin App Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository (same repo as web)
4. Set the following configuration:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/admin`
   - **Build Command**: `cd ../.. && pnpm run build --filter=@netprophet/admin`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

## Environment Variables

Make sure to set the following environment variables for each deployment:

### Web App

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Admin App

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## How It Works

### Turborepo Integration

- **Smart Filtering**: Uses `--filter` to build only the specific app and its dependencies
- **Dependency Management**: Automatically builds shared packages (`@netprophet/lib`, `@netprophet/ui`) when needed
- **Caching**: Leverages Turborepo's caching for faster builds
- **Turbo Ignore**: Uses `turbo-ignore` to determine if deployment is needed based on file changes

### Deployment Triggers

- **Web App**: Only deploys when changes are made to `apps/web/` or shared packages
- **Admin App**: Only deploys when changes are made to `apps/admin/` or shared packages
- **Shared Dependencies**: Both apps share the `@netprophet/lib` package, so changes to it will trigger both deployments

## Deployment URLs

After setup, you'll have two separate URLs:

- Web App: `https://your-web-app.vercel.app`
- Admin App: `https://your-admin-app.vercel.app`

## Troubleshooting

If deployments fail:

1. Check that `pnpm-lock.yaml` is committed to the repository
2. Ensure all environment variables are set correctly
3. Verify that the root directory paths are correct in Vercel settings
4. Check that shared packages (`@netprophet/lib`, `@netprophet/ui`) are building correctly

## Turborepo Best Practices

This setup follows [Turborepo best practices](https://turborepo.com/docs):

- ✅ **Single build command**: Uses `pnpm run build --filter=@package` for efficiency
- ✅ **Proper dependency management**: `dependsOn: ["^build"]` ensures correct build order
- ✅ **Caching**: Leverages Turborepo's built-in caching
- ✅ **Selective deployment**: Uses `turbo-ignore` to deploy only when needed
- ✅ **Frozen lockfile**: Ensures reproducible builds with `--frozen-lockfile`
