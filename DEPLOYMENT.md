# Deployment Guide

This project is set up for separate Vercel deployments for the web and admin apps.

## Setup Instructions

### 1. Web App Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Set the following configuration:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm run build --filter=@netprophet/web`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

### 2. Admin App Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository (same repo as web)
4. Set the following configuration:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/admin`
   - **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm run build --filter=@netprophet/admin`
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

- **Web App**: Only deploys when changes are made to `apps/web/` or shared packages
- **Admin App**: Only deploys when changes are made to `apps/admin/` or shared packages
- **Turbo Ignore**: Uses `turbo-ignore` to determine if a deployment is needed based on file changes
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
