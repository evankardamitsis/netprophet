# Profile Claim Flow Components

This folder contains all components related to the profile claim flow functionality.

## Main Components

### Core Flow Components

- **ProfileClaimFlowNew.tsx** - Main orchestrator component that manages the entire profile claim flow
- **ProfileClaimFormNew.tsx** - Form component for user to input their name and accept terms
- **ProfileClaimResultNew.tsx** - Results component showing player matches or creation options
- **ProfileClaimSuccessNew.tsx** - Success component shown after successful profile claim/creation
- **ProfileCreationReview.tsx** - Review component for new player profile creation
- **StepIndicator.tsx** - Visual step indicator for the flow progress

### Supporting Files

- **types.ts** - TypeScript type definitions for the profile claim flow
- **index.ts** - Barrel export file for easy imports

## Test Components

### Testing Dashboard

- **ProfileClaimFlowTestDashboard.tsx** - Centralized dashboard for all testing modes
- **ProfileClaimFlowTestEnhanced.tsx** - Enhanced testing with existing database users
- **ProfileClaimFlowTestScenarios.tsx** - Scenario-based testing with temporary users
- **ProfileClaimFlowTestManual.tsx** - Manual testing with specific user IDs
- **ProfileClaimFlowDebug.tsx** - Debug component for getUserName function
- **ProfileClaimFlowTest.tsx** - Simple test component for basic functionality

## Usage

### Importing Components

```typescript
// Import individual components
import { ProfileClaimFlowNew } from "@/components/profile-claim-flow/ProfileClaimFlowNew";

// Or use the barrel export
import {
  ProfileClaimFlowNew,
  ProfileClaimFormNew,
} from "@/components/profile-claim-flow";
```

### Testing

Access the test dashboard at `/test-profile-claim-dashboard` to test various scenarios of the profile claim flow.

## Features

- **X Close Buttons**: All modal headers include close buttons for better UX
- **Responsive Design**: All components are mobile-friendly
- **Internationalization**: Full support for English and Greek languages
- **Type Safety**: Comprehensive TypeScript types
- **Testing Suite**: Complete testing infrastructure for development and debugging
