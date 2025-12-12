# Doubles Feature Implementation Scope

## Overview

This document outlines the scope for implementing Doubles matches support in the NetProphet platform. Doubles matches involve 4 players (2 per team) instead of the current 2 players (1 per team).

## Current System Analysis

### Database Structure

- **matches table**: Currently supports `player_a_id` and `player_b_id` (singles only)
- **match_results table**: Supports set winners with single player references
- **tournaments table**: Has `tournament_type` field that includes 'doubles' option, but matches don't support it yet
- **bets table**: References matches and supports predictions for single players

### Current Match Flow

1. Admin creates match with 2 players (player_a_id, player_b_id)
2. Odds are calculated for 2 individual players
3. Users make predictions on which player will win
4. Match results record winner and set scores for single players

## Required Changes

### 1. Database Schema Changes

#### 1.1 Matches Table

- Add `match_type` field: `ENUM('singles', 'doubles')` DEFAULT 'singles'
- Add doubles player fields:
  - `player_a1_id` UUID (nullable, for doubles Team A Player 1)
  - `player_a2_id` UUID (nullable, for doubles Team A Player 2)
  - `player_b1_id` UUID (nullable, for doubles Team B Player 1)
  - `player_b2_id` UUID (nullable, for doubles Team B Player 2)
- Add constraint: For doubles matches, all 4 player fields must be set; for singles, only player_a_id and player_b_id
- Update existing indexes to include new player fields

#### 1.2 Match Results Table

- Add doubles set winner fields:
  - `set1_winner_a1_id`, `set1_winner_a2_id`, `set1_winner_b1_id`, `set1_winner_b2_id` (for doubles)
  - Similar for sets 2-5
- Add `match_winner_team` field: `ENUM('team_a', 'team_b')` for doubles
- Update winner_id logic: For doubles, winner_id should reference the team (or create team concept)

#### 1.3 Bets/Predictions

- Current bets table references matches and has prediction field
- For doubles, prediction should indicate which team wins ('team_a' or 'team_b')
- May need to update prediction format to support team-based predictions

### 2. Admin Interface Changes

#### 2.1 Match Creation Form (`apps/admin/src/app/tournaments/MatchForm.tsx`)

- Add match type selector (singles/doubles)
- Conditional rendering:
  - Singles: Show 2 player selectors (player_a_id, player_b_id)
  - Doubles: Show 4 player selectors (player_a1_id, player_a2_id, player_b1_id, player_b2_id)
- Validation: Ensure all required players are selected based on match type
- Update form schema to include match_type and conditional player fields

#### 2.2 Match Display/List Views

- Update match list to show doubles teams properly:
  - Singles: "Player A vs Player B"
  - Doubles: "Player A1 & Player A2 vs Player B1 & Player B2"
- Update match detail views to show all 4 players for doubles

#### 2.3 Match Results Form (`apps/admin/src/app/match-results/page.tsx`)

- Update form to handle doubles:
  - Show 4 players for set winner selection in doubles matches
  - Update winner selection to be team-based for doubles
  - Update set score inputs to work with doubles teams

### 3. Library/Shared Code Changes

#### 3.1 Types (`packages/lib/src/types/`)

- Update `Match` interface to include:
  - `match_type: 'singles' | 'doubles'`
  - `player_a1_id`, `player_a2_id`, `player_b1_id`, `player_b2_id` (nullable)
  - Related player objects for doubles
- Update `MatchResult` interface for doubles support
- Update `PredictionItem` to support team-based predictions

#### 3.2 Odds Calculation (`packages/lib/src/odds/calculateOdds.ts`)

- Create new function `calculateDoublesOdds()` that:
  - Takes 4 players (2 per team)
  - Combines player stats for each team:
    - Average NTRP ratings
    - Combined form (average or weighted)
    - Combined surface preferences
    - Combined experience
  - Calculates team vs team odds
- Update existing `calculateOdds()` to detect match type and route accordingly
- Consider doubles-specific factors:
  - Team chemistry/partnership history
  - Combined strengths/weaknesses

#### 3.3 Match Service (`packages/lib/src/supabase/matches.ts`)

- Update `getMatch()` to fetch all 4 players for doubles matches
- Update `createMatch()` and `updateMatch()` to handle doubles fields
- Update match queries to join with all 4 player tables when needed

### 4. Web Interface Changes

#### 4.1 Match Display Components

- **MatchCard** (`apps/web/src/components/matches/`):
  - Display doubles teams: "Player A1 & Player A2 vs Player B1 & Player B2"
  - Show team odds instead of individual player odds
- **MatchDetail** (`apps/web/src/components/matches/MatchDetail.tsx`):
  - Conditionally render 2 or 4 players based on match_type
  - Update match header to show doubles teams
  - Update player stats display for doubles (show team stats)

#### 4.2 Prediction Components

- **PredictionForm** (`apps/web/src/components/matches/PredictionForm.tsx`):
  - For doubles: Show team selection instead of individual player selection
  - Update prediction format to support team-based predictions
  - Update set winner predictions for doubles (team-based)

- **PredictionSlip** (`apps/web/src/components/matches/PredictionSlip/PredictionSlip.tsx`):
  - Display doubles matches with team names
  - Update prediction display format for doubles

#### 4.3 Dictionary Updates (`apps/web/src/types/dictionary.ts`)

- Add doubles-related translations:
  - `doublesMatch`, `singlesMatch`
  - `teamA`, `teamB`
  - `selectTeam`, `selectTeamWinner`
  - `doublesFormat`, etc.

### 5. Edge Functions

#### 5.1 Calculate Odds Function (`supabase/functions/calculate-odds/index.ts`)

- Update to detect match_type
- Route to singles or doubles odds calculation
- For doubles: Fetch all 4 players' data and calculate team odds
- Update odds storage (odds_a, odds_b represent team odds for doubles)

### 6. Match Automation

#### 6.1 Match Automation Function (`supabase/functions/match-automation/index.ts`)

- Ensure it handles doubles matches correctly
- Update match result processing for doubles

## Implementation Phases

### Phase 1: Database Foundation

1. Create migration for match_type and doubles player fields
2. Update match_results table for doubles
3. Update RLS policies
4. Test database changes

### Phase 2: Backend/Library

1. Update types and interfaces
2. Implement doubles odds calculation
3. Update match service functions
4. Update edge functions

### Phase 3: Admin Interface

1. Update match creation form
2. Update match display/list views
3. Update match results form
4. Test admin workflows

### Phase 4: Web Interface

1. Update match display components
2. Update prediction components
3. Update dictionary
4. Test user workflows

### Phase 5: Testing & Polish

1. End-to-end testing
2. Edge case handling
3. UI/UX refinements
4. Documentation updates

## Key Considerations

### Odds Calculation for Doubles

- How to combine two players' stats into team stats:
  - Average NTRP ratings
  - Weighted form (recent matches more important)
  - Surface preferences (best of both)
  - Experience (combined match count)
- Consider partnership history if available
- May need to adjust algorithm weights for doubles

### Prediction Format

- Current: Predictions reference individual players
- Doubles: Predictions should reference teams
- Need to maintain backward compatibility with existing singles predictions

### Display Format

- Singles: "John Doe vs Jane Smith"
- Doubles: "John Doe & Mike Johnson vs Jane Smith & Sarah Williams"
- Consider UI space constraints on mobile

### Tournament Integration

- Tournaments already have `tournament_type` field
- When creating matches in a doubles tournament, default match_type to 'doubles'
- Validate match_type matches tournament_type

## Testing Checklist

- [ ] Create doubles match in admin
- [ ] Calculate odds for doubles match
- [ ] Display doubles match on web
- [ ] Make prediction on doubles match
- [ ] Add doubles match to parlay
- [ ] Submit match result for doubles
- [ ] Resolve bets for doubles matches
- [ ] Filter matches by type (singles/doubles)
- [ ] Mixed tournament with both singles and doubles matches
- [ ] Edge cases: Missing players, cancelled matches, etc.

## Migration Strategy

1. Add new fields as nullable initially
2. Set default match_type to 'singles' for existing matches
3. Migrate existing data (if any doubles tournaments exist)
4. Update application code to handle both types
5. Add validation to prevent invalid combinations
6. Gradually roll out feature

## Open Questions

1. Should we support mixed doubles (male/female teams)?
2. How to handle player substitutions in doubles?
3. Should doubles matches have different point values?
4. How to display doubles in mobile view (space constraints)?
5. Should we track doubles-specific stats (partnership win rate)?
