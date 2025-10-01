# NetProphet TODO List

## Authentication & Security

- [x] **🔴 HIGH PRIORITY: Implement server-side admin authentication** - Added secure JWT token validation and admin privilege checks for all admin API routes
- [x] **Add rate limiting for authentication attempts** - Configured Supabase rate limits: 5 sign-in/sign-up attempts per 5 minutes, 10 OTP verifications per 5 minutes
- [x] **Implement password strength requirements** - Set minimum 8 characters with uppercase, lowercase, and digits required
- [x] **Add two-factor authentication (2FA) for all users** - ✅ COMPLETED: Full 2FA implementation with proper authentication flow, RLS policies, email templates, real-time validation, and session management
- [x] **Audit and review RLS policies for all tables** - Created comprehensive RLS policy audit and fix scripts ensuring all tables have proper security policies
- [x] **Add session timeout configuration** - Configured Supabase session timeouts: 24h maximum session, 2h inactivity timeout, 1h JWT expiry

## 🔴 CRITICAL ISSUES

- [x] **🔴 CRITICAL: Fix daily login streak functionality** - ✅ COMPLETED: Fixed database functions to always give 30 coins daily, removed streak requirement for daily rewards, fixed frontend logic to allow all users to claim rewards
- [x] **🔴 CRITICAL: Complete transactional email system** - ✅ COMPLETED: Fixed logo loading with SVG text fallback, created all missing email templates (winnings, welcome, promotional), implemented complete transactional email system
- [ ] **🔴 CRITICAL: Set up promotional email system** - Implement promotional email campaigns and user segmentation
- [x] **🔴 CRITICAL: Implement hidden players feature** - ✅ COMPLETED: Set up system for hiding/showing players in match listings with active/inactive status
- [x] **🔴 CRITICAL: Add player profile claim system** - ✅ COMPLETED: Allow users to claim and customize their profile with name/surname after registration, including Greeklish name matching
- [x] **🔴 CRITICAL: Fix PromotionalHero component disappearing** - PromotionalHero.tsx disappears when there are no upcoming matches, should show promotional content instead
- [x] **🔴 CRITICAL: Add "My Predictions" feature** - ✅ COMPLETED: Allow users to view and track their prediction history

## Admin Panel Improvements

- [ ] Improve mobile responsiveness

## Web App Features

- [x] **🔴 HIGH PRIORITY: Implement Head to Head update on each player after posting match results**
- [x ] Add user profile management
- [ ] Implement email preferences settings
- [ ] Create user achievement system
- [ ] Add social features (friends, leaderboards)
- [ ] Implement referral system

## Performance & Optimization

- [ ] Implement Redis caching for frequently accessed data
- [ ] Add database query optimization
- [ ] Implement lazy loading for large datasets
- [x ] Add CDN for static assets
- [ ] Optimize bundle sizes

## Mobile App

- [ ] Implement push notifications
- [ ] Add offline functionality
- [ ] Create native mobile features
- [ ] Add biometric authentication

## Testing & Quality

- [ ] Add comprehensive unit tests
- [ ] Implement integration tests
- [ ] Add end-to-end testing
- [ ] Set up automated testing pipeline
- [ ] Add performance monitoring

## Infrastructure & DevOps

- [ ] Set up monitoring and alerting
- [ ] Implement automated backups
- [ ] Add staging environment
- [ ] Set up CI/CD pipeline improvements
- [ ] Add database migration automation

## Documentation

- [ ] Create API documentation
- [ ] Add developer onboarding guide
- [ ] Create user documentation
- [ ] Add deployment guides

## Bug Fixes & Technical Debt

- [x] **🔴 HIGH PRIORITY: INVESTIGATE: Admin app auth re-rendering issue** - Fixed by optimizing useAuth hook to skip INITIAL_SESSION events after initialization, removing unnecessary loading state changes, and only processing meaningful auth state changes
- [x] **🔴 HIGH PRIORITY: INVESTIGATE: Web app auth performance** - Fixed by optimizing useAuth hook and WalletContext to prevent unnecessary wallet syncs on INITIAL_SESSION events
- [ ] Fix TypeScript version compatibility warnings
- [ ] Resolve ESLint warnings in admin components
- [ ] Optimize database indexes
- [ ] Clean up unused code and dependencies

---

## Completed Tasks

- [x] Fix admin authentication performance issues
- [x] Implement proper sign out functionality
- [x] Fix infinite loading in admin app
- [x] Optimize auth state management
- [x] Fix new user balance issue - remove hardcoded 1250/1000 default values
- [x] Fix welcome bonus and daily login claiming for new users

---

_Last updated: $(date)_
