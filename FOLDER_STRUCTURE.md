# NetProphet Folder Structure - Route Groups

## Overview

The `/apps/web/src/app/[lang]` directory has been reorganized using Next.js route groups to clearly separate marketing pages from the web application.

---

## Route Group Structure

```
apps/web/src/app/[lang]/
├── (marketing)/              # Marketing & Public Pages
│   ├── layout.tsx           # Pass-through layout (pages handle own Header/Footer)
│   ├── page.tsx             # Homepage
│   ├── HomePageClientGame.tsx
│   ├── HomePageClient.tsx
│   ├── how-it-works/
│   │   ├── page.tsx
│   │   └── HowItWorksPageGame.tsx
│   ├── contact/
│   │   └── page.tsx
│   ├── faq/
│   │   └── page.tsx
│   ├── help-center/
│   │   └── page.tsx
│   ├── privacy/
│   │   └── page.tsx
│   └── terms/
│       └── page.tsx
│
├── (app)/                   # Web Application Pages
│   ├── layout.tsx          # Shared app layout with ClientLayout
│   ├── matches/
│   │   ├── page.tsx
│   │   └── match/[id]/page.tsx
│   ├── leaderboard/
│   │   └── page.tsx
│   ├── my-picks/
│   │   └── page.tsx
│   ├── my-profile/
│   │   └── page.tsx
│   ├── rewards/
│   │   └── page.tsx
│   ├── results/
│   │   └── page.tsx
│   └── players/
│       ├── page.tsx
│       └── [id]/page.tsx
│
├── auth/                    # Authentication (separate)
│   ├── signin/
│   ├── callback/
│   └── profile-setup/
│
└── layout.tsx              # Root locale layout
```

---

## Route Groups Explained

### What are Route Groups?

Route groups in Next.js use parentheses `()` to organize routes without affecting the URL structure:

- `(marketing)` folder doesn't appear in URLs
- `(app)` folder doesn't appear in URLs
- Both groups share the same `[lang]` parameter

### URL Examples

**Marketing Pages:**

- `/en` → Homepage from `(marketing)/page.tsx`
- `/en/how-it-works` → From `(marketing)/how-it-works/page.tsx`
- `/en/contact` → From `(marketing)/contact/page.tsx`

**App Pages:**

- `/en/matches` → From `(app)/matches/page.tsx`
- `/en/leaderboard` → From `(app)/leaderboard/page.tsx`
- `/en/my-picks` → From `(app)/my-picks/page.tsx`

**Auth Pages:**

- `/en/auth/signin` → From `auth/signin/page.tsx`

---

## Layout Hierarchy

### Marketing Pages Layout Chain:

```
[lang]/layout.tsx (root)
  └── (marketing)/layout.tsx (pass-through)
      └── Individual pages (handle own Header/Footer)
```

**Characteristics:**

- Pages render Header and Footer themselves
- No sidebar or navigation chrome
- Uses vibrant landing page aesthetics
- Examples: HomePageClientGame, HowItWorksPageGame

### App Pages Layout Chain:

```
[lang]/layout.tsx (root)
  └── (app)/layout.tsx (with ClientLayout)
      └── Individual pages
```

**Characteristics:**

- Wrapped in ClientLayout
- Has TopNavigation, Sidebar, PredictionSlip
- Uses game-like main app aesthetic
- Examples: Matches, Leaderboard, My Picks

### Auth Pages Layout Chain:

```
[lang]/layout.tsx (root)
  └── Individual auth pages
```

**Characteristics:**

- No additional layout wrapper
- Standalone auth flows
- Minimal chrome

---

## Benefits of This Structure

### 1. Clear Separation

- ✅ Marketing pages visually distinct from app pages
- ✅ Easy to identify which pages are public vs authenticated
- ✅ Different design systems can be applied to each group

### 2. Shared Layouts

- ✅ All app pages automatically get ClientLayout
- ✅ No need to wrap each app page individually
- ✅ Reduced code duplication

### 3. Better Developer Experience

- ✅ Easier to find pages by purpose
- ✅ Clear mental model of the application
- ✅ Simpler to onboard new developers

### 4. Maintainability

- ✅ Apply design changes to all marketing pages at once
- ✅ Apply app chrome changes to all app pages at once
- ✅ Easier to add new pages to either section

### 5. URLs Unchanged

- ✅ Route groups don't affect URLs
- ✅ No breaking changes for users
- ✅ SEO remains intact

---

## Layout Files

### `(marketing)/layout.tsx`

```tsx
// Pass-through layout
// Marketing pages handle their own Header/Footer
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return <>{children}</>;
}
```

### `(app)/layout.tsx`

```tsx
// Shared app layout with navigation, sidebar, prediction slip
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { lang } = await params;
  const dict = getDictionary(lang);

  return (
    <ClientLayout dict={dict} lang={lang}>
      {children}
    </ClientLayout>
  );
}
```

---

## Migration Notes

### What Changed:

1. Created `(marketing)` route group for public pages
2. Created `(app)` route group for authenticated app pages
3. Moved homepage to `(marketing)/page.tsx`
4. Moved all marketing pages to `(marketing)/`
5. Moved all app pages to `(app)/`
6. Created shared layouts for each group
7. Removed individual `layout.tsx` files from app pages

### What Stayed the Same:

- All URL paths remain unchanged
- Auth flow stays separate
- Root locale layout (`[lang]/layout.tsx`) unchanged
- No code changes to page components

---

## Adding New Pages

### To Add a Marketing Page:

```bash
# Create in (marketing) route group
apps/web/src/app/[lang]/(marketing)/new-page/
└── page.tsx
```

The page will automatically:

- NOT have ClientLayout
- Need to render its own Header/Footer
- Be accessible at `/[lang]/new-page`

### To Add an App Page:

```bash
# Create in (app) route group
apps/web/src/app/[lang]/(app)/new-feature/
└── page.tsx
```

The page will automatically:

- Have ClientLayout with nav, sidebar, prediction slip
- Have access to all app contexts
- Be accessible at `/[lang]/new-feature`

---

## Design System Application

### Marketing Pages:

- Use landing page aesthetic (vibrant, promotional)
- Design system can be applied uniformly
- Focus on conversion and engagement

### App Pages:

- Use game-like main app aesthetic
- Already using centralized design system
- Focus on functionality and usability

---

## File Count Summary

### Marketing Group (10 pages):

- Homepage
- How It Works
- Contact
- FAQ
- Help Center
- Privacy
- Terms
- (Plus 2 client component files)

### App Group (8 page types):

- Matches (with dynamic match detail)
- Leaderboard
- My Picks
- My Profile
- Rewards
- Results
- Players (with dynamic player detail)

### Auth (3 flows):

- Sign In
- Callback
- Profile Setup

**Total:** 21 distinct user-facing pages

---

## Import Path Updates

No import path updates needed! Route groups are transparent:

- Components still import from same relative paths
- No changes to component references
- No changes to router.push() calls

---

## Conclusion

The route group organization provides:
✅ Clear separation of concerns
✅ Better code organization  
✅ Easier maintenance
✅ Scalability for future pages
✅ No breaking changes

**Implementation Date:** October 13, 2025
**Status:** ✅ Complete
