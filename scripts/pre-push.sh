#!/usr/bin/env sh

echo "🚀 Running pre-push checks for production..."

# Run linting
echo "📝 Running linting..."
pnpm lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix the issues before pushing."
    exit 1
fi

# Run type checking
echo "🔍 Running type checking..."
pnpm type-check
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed. Please fix the issues before pushing."
    exit 1
fi

# Run builds for critical packages to catch deployment errors
echo "🏗️  Running builds for critical packages..."
# Force fresh builds by clearing cache first
echo "🧹 Clearing build cache for fresh builds..."
rm -rf packages/lib/dist
rm -rf apps/web/.next
rm -rf apps/admin/.next
rm -rf .turbo

# Force rebuild lib package first to ensure exports are available
echo "🔨 Building lib package first..."
pnpm build --filter=@netprophet/lib --force
if [ $? -ne 0 ]; then
    echo "❌ Lib package build failed. Please fix the issues before pushing."
    exit 1
fi

# Build web app
echo "🌐 Building web app..."
pnpm build --filter=@netprophet/web --force
if [ $? -ne 0 ]; then
    echo "❌ Web app build failed. Please fix the issues before pushing."
    exit 1
fi

# Build admin app
echo "⚙️  Building admin app..."
pnpm build --filter=@netprophet/admin --force
if [ $? -ne 0 ]; then
    echo "❌ Admin app build failed. Please fix the issues before pushing."
    exit 1
fi

echo "✅ All pre-push checks passed!"
echo "🚀 Ready to push to production!" 