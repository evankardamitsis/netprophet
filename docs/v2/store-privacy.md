# Store privacy answers (Apple privacy labels, Google Play data safety)

Drafted 16 Oct 2026 from what the code keeps: `core.profiles`, votes, follows, reactions, kudos, logged matches,
cosmetics, push tokens (`push.ts`), PostHog EU events by user id (`analytics.ts`, never email), Resend for sign-in
emails, Supabase and Vercel hosting. No ads SDK, no tracking across other companies' apps, no location, no contacts.
Review with the founder before submitting; update if analytics or payments change.

## Apple: App Privacy

**Tracking:** No. (We do not link data with third-party data for advertising, and do not share it with data brokers.)

| Data type | Collected | Linked to the user | Used for |
|---|---|---|---|
| Contact info: email address | Yes | Yes | App functionality (sign-in) |
| Contact info: name | Yes | Yes | App functionality (profile, player claim) |
| User content: other (votes, reactions, logged matches) | Yes | Yes | App functionality |
| Identifiers: user ID | Yes | Yes | App functionality, analytics |
| Usage data: product interaction | Yes | Yes | Analytics |
| Diagnostics: crash data | Only once crash reporting is added | Yes | App functionality |
| Purchases: purchase history | Once Pro and cosmetics are sold | Yes | App functionality |
| Other data: gender | Yes | Yes | App functionality (categories and match rules) |

Not collected: location, health, financial info, contacts, browsing history, search history, sensitive info,
photos or videos, audio, device ID for advertising.

## Google Play: Data safety

- **Does your app collect or share user data?** Collects; does not share (processors acting for us do not count as
  sharing).
- **Is data encrypted in transit?** Yes.
- **Can users request deletion?** Yes, by email today (hello@monadlabs.gr); in the app once account deletion ships.
  Deletion URL for the form: `https://netprophetapp.com/support`.

| Category | Type | Collected | Optional | Purpose |
|---|---|---|---|---|
| Personal info | Name | Yes | No | App functionality, account management |
| Personal info | Email address | Yes | No | Account management |
| Personal info | Other info (gender) | Yes | No | App functionality |
| Personal info | User IDs | Yes | No | App functionality, analytics |
| App activity | App interactions | Yes | No | Analytics |
| App activity | Other user-generated content (votes, reactions, matches) | Yes | No | App functionality |
| App info and performance | Crash logs | Once crash reporting is added | No | App functionality |
| Financial info | Purchase history | Once Pro and cosmetics are sold | No | App functionality |
| Device or other IDs | Device push token | Yes | Yes (only if notifications are allowed) | App functionality (notifications) |

## Content rating questionnaire (both stores)

- Violence, sexual content, drugs, gambling: none. Simulated gambling: **No** (players call results for points and
  a streak; nothing is staked, nothing is won or lost in money).
- User-generated content: limited (reactions from a fixed list, short kudos from a fixed list, logged matches);
  report and block exist.
- Users can interact: yes (follow, kudos, see each other's names and points).
- Shares location: no. Digital purchases: yes, once Pro is sold.
