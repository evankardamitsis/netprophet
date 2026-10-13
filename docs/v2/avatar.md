# NetProphet v2: the player avatar (M4.5)

Decided with the founder, 13 Oct 2026. No 3D. A 2D illustrated player in a NetProphet style of our own, made from the
player's photo or picked from our defaults; the cosmetics (kits, frames, backgrounds, win effects) stack around it.
Options page with the round 1 wardrobe and the round 2 style concepts: https://claude.ai/artifact/WSmyDPvzrYPJD2edfrFaUJ

## Style
- Base: the bold sticker direction (thick outlines, flat colour, big personality), in our palette (ink, paper, lime).
- Frames and backgrounds borrow the editorial poster's print grain; manga speed lines only in win effects.
- A style sheet fixes it: written rules (outline weight, colours, how faces and hair are drawn) plus about 8 reference
  drawings. Every generation gets the sheet, which is what keeps every avatar in one style.

## What we own (made once)
- Two body types, three poses each (ready, serve, celebrate), with a fixed neck anchor and head box per pose.
- Clothing layers on those bodies: shirt, shorts or skirt, shoes, racket, wristband, headband or visor. A kit is a set
  of layers and colours, so a new kit never needs a new generation.
- About 12 default players (6 men, 6 women; mid-20s to about 60; a spread of skin tones and hair; a beard, glasses,
  grey hair, bald, a ponytail among them).
- A neutral silhouette with initials for roster players without an account.

## The photo flow
1. Εγώ, «Εμφάνιση», «Φτιάξε τον παίκτη σου». One selfie or a photo from the library, after a one-line consent
   («Η φωτό σβήνεται αμέσως, κρατάμε μόνο το σχέδιο»). 15+ only, as at sign-up. The phone checks for exactly one face,
   looking at the camera.
2. The photo goes to a private, owner-only storage bucket (`avatar-inputs`).
3. A Supabase edge function (`avatar-generate`): checks the player has a creation left; sends the photo, the style
   sheet and a fixed instruction (head and hair only, transparent background, our proportions) to the image model;
   gets 3 variants; checks them (one head, transparent, right size); snaps the skin tone to our palette so arms and
   legs match; deletes the photo.
4. The player picks one. The head is stored with the account (`core.user_avatars`: kind photo or preset, head path,
   skin tone, status); deletable any time.
5. The app draws the head on our body and pose with the kit layers, and the frame, background and win effect around
   it on the Εγώ card. Feed, Κατάταξη, profiles and share cards use a still the server renders once per look (Rive
   cannot run on the server). With Rive later, the head image drops into the rig's image slot and the player animates.

## Rules
- One free creation (3 variants) and two retries; then 0,99€, or a new one each month with Pro. Each try costs us a few
  cents to about 20 cents in model fees.
- A refused or failed generation falls back to the default and charges nothing.
- Headwear at first: headband and visor only (they sit on the forehead); caps once we know they fit generated hair.
- Privacy: a face photo is personal data. Explicit opt-in, the provider's API terms must exclude training on our data,
  the photo is deleted at once, the drawing is kept only while the player wants it. Privacy policy and consent copy
  updated before launch.

## Defaults
- Players with an account who skip the photo pick one of the 12; sign-up preselects one by the profile's gender.
- Everyone starts in Πράσινο, no frame, the ink background.
- Roster players without an account get the silhouette with initials, never a face (a real person who did not choose
  one); they get a real avatar when they claim the profile.

## Cosmetics kept from the options page (new, to add to the catalogue)
Kits: Ρετρό 80s (1,99€), Καλοκαίρι (seasonal, 1,99€), Σετ τουρνουά (earned by playing a partner tournament).
Frame: Κιμωλία (1,99€). Backgrounds: Ηλιοβασίλεμα (seasonal, 0,99€), Γήπεδο padel (when padel opens).
Win effects: Κιμωλία and Μπαλάκια (1,99€ each) next to Κομφετί; a plain lime flash for everyone.
Accessories: Κορδέλα (earned, 3 weeks in a row), Γείσο and Μπαντάνα (0,99€). Skin, hair and hair colour are never sold.

## Build
1. Art: style sheet, bodies and poses, clothing layers, the 12 defaults, the silhouette (image model plus clean-up
   into layers, with the founder's go-ahead to generate; or a commissioned set).
2. Server: `core.user_avatars`, the two buckets, `avatar-generate`, the still renderer for share cards.
3. App: the «Εμφάνιση» flow, picking a default, drawing the layers on the card.
4. Later: Rive animation (needs Expo development builds instead of Expo Go).

## Needed from the founder
- The image API (OpenAI or Google) and its key, stored as an edge function secret; a monthly spending cap.
- Approval of the consent copy.
