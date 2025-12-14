#!/bin/bash

# Test script for athlete registration flow fixes
# This script helps test the Google OAuth name extraction and pending status fixes

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Athlete Registration Flow Test Script ===${NC}\n"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}Error: Please run this script from the project root${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo -e "${GREEN}✓ Project directory confirmed${NC}\n"

# Function to create a test user with email-based name extraction
create_test_oauth_user() {
    local email=$1
    local expected_first=$2
    local expected_last=$3
    
    echo -e "${BLUE}Creating test user: ${email}${NC}"
    
    # Create SQL to insert test user
    cat > /tmp/test_user.sql << EOF
-- Create test user simulating Google OAuth (no name in metadata)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    '${email}',
    crypt('testpassword123', gen_salt('bf')),
    NOW(),
    '{}'::jsonb,
    NOW(),
    NOW()
) RETURNING id, email;
EOF

    # Execute SQL (this will trigger handle_new_user)
    echo "Executing SQL to create user..."
    # Note: You'll need to connect to your database directly
    # This is a template - adjust based on your setup
    
    echo -e "${YELLOW}⚠ Note: You need to run this SQL manually in Supabase dashboard${NC}"
    echo -e "${YELLOW}   or use: psql \$DATABASE_URL -f /tmp/test_user.sql${NC}\n"
    
    cat /tmp/test_user.sql
    echo ""
}

# Function to verify name extraction
verify_name_extraction() {
    local email=$1
    local expected_first=$2
    local expected_last=$3
    
    echo -e "${BLUE}Verifying name extraction for: ${email}${NC}"
    
    cat > /tmp/verify_names.sql << EOF
SELECT 
    p.email,
    p.first_name,
    p.last_name,
    CASE 
        WHEN p.first_name = '${expected_first}' AND p.last_name = '${expected_last}' THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS result
FROM profiles p
WHERE p.email = '${email}';
EOF

    echo -e "${YELLOW}Run this SQL to verify:${NC}"
    cat /tmp/verify_names.sql
    echo ""
}

# Function to test pending status
test_pending_status() {
    local email=$1
    
    echo -e "${BLUE}Testing pending status for: ${email}${NC}"
    
    cat > /tmp/test_pending.sql << EOF
-- Set user to pending status
UPDATE profiles
SET profile_claim_status = 'pending',
    updated_at = NOW()
WHERE email = '${email}';

-- Verify status
SELECT 
    email,
    profile_claim_status,
    first_name,
    last_name
FROM profiles
WHERE email = '${email}';
EOF

    echo -e "${YELLOW}Run this SQL to set pending status:${NC}"
    cat /tmp/test_pending.sql
    echo ""
}

# Main menu
echo "Select test scenario:"
echo "1. Test email name extraction (john.doe@example.com)"
echo "2. Test email name extraction (jane_smith@example.com)"
echo "3. Test email name extraction (bob-wilson@example.com)"
echo "4. Test single name extraction (alice@example.com)"
echo "5. Test pending status flow"
echo "6. Run all tests"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        create_test_oauth_user "john.doe.test@example.com" "John" "Doe"
        verify_name_extraction "john.doe.test@example.com" "John" "Doe"
        ;;
    2)
        create_test_oauth_user "jane_smith.test@example.com" "Jane" "Smith"
        verify_name_extraction "jane_smith.test@example.com" "Jane" "Smith"
        ;;
    3)
        create_test_oauth_user "bob-wilson.test@example.com" "Bob" "Wilson"
        verify_name_extraction "bob-wilson.test@example.com" "Bob" "Wilson"
        ;;
    4)
        create_test_oauth_user "alice.test@example.com" "Alice" ""
        verify_name_extraction "alice.test@example.com" "Alice" ""
        ;;
    5)
        read -p "Enter email to test pending status: " email
        test_pending_status "$email"
        ;;
    6)
        echo -e "${GREEN}Running all tests...${NC}\n"
        create_test_oauth_user "john.doe.test@example.com" "John" "Doe"
        verify_name_extraction "john.doe.test@example.com" "John" "Doe"
        echo ""
        create_test_oauth_user "jane_smith.test@example.com" "Jane" "Smith"
        verify_name_extraction "jane_smith.test@example.com" "Jane" "Smith"
        echo ""
        create_test_oauth_user "bob-wilson.test@example.com" "Bob" "Wilson"
        verify_name_extraction "bob-wilson.test@example.com" "Bob" "Wilson"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Test SQL files created in /tmp/${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy the SQL from above"
echo "2. Run it in Supabase SQL Editor or via psql"
echo "3. Verify the results"
echo ""
echo -e "${BLUE}For manual testing:${NC}"
echo "- Sign in with the test user credentials"
echo "- Navigate to /auth/profile-setup"
echo "- Verify the flow works as expected"
