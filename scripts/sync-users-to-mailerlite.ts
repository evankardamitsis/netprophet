#!/usr/bin/env tsx
/**
 * Sync all existing users to MailerLite
 * 
 * This script:
 * 1. Fetches all users from the profiles table
 * 2. Queues them for MailerLite subscription via mailerlite_logs
 * 3. The mailerlite-process-queue Edge Function will process them
 * 
 * Usage:
 *   tsx scripts/sync-users-to-mailerlite.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

async function syncUsersToMailerlite() {
  console.log('🔄 Starting MailerLite user sync...\n');

  try {
    // Fetch all users from profiles
    console.log('📋 Fetching all users from profiles table...');
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .not('email', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('✅ No users found to sync.');
      return;
    }

    console.log(`📊 Found ${profiles.length} users to sync.\n`);

    // Check which users are already in mailerlite_logs (pending or successful)
    const { data: existingLogs } = await supabase
      .from('mailerlite_logs')
      .select('email, status')
      .in('status', ['pending', 'success']);

    const existingEmails = new Set(
      existingLogs?.map(log => log.email?.toLowerCase()).filter(Boolean) || []
    );

    // Filter out users already queued or synced
    const usersToSync = profiles.filter(
      profile => profile.email && !existingEmails.has(profile.email.toLowerCase())
    );

    if (usersToSync.length === 0) {
      console.log('✅ All users are already queued or synced to MailerLite.');
      return;
    }

    console.log(`📝 Queuing ${usersToSync.length} new users for MailerLite subscription...\n`);

    // Batch insert into mailerlite_logs (100 at a time)
    const batchSize = 100;
    let synced = 0;
    let skipped = 0;

    for (let i = 0; i < usersToSync.length; i += batchSize) {
      const batch = usersToSync.slice(i, i + batchSize);
      
      const logsToInsert = batch.map(profile => ({
        user_id: profile.id,
        email: profile.email,
        name: profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : profile.first_name || profile.last_name || null,
        status: 'pending',
        groups: null, // Will use default group from MAILERLITE_GROUP_ID env var
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('mailerlite_logs')
        .insert(logsToInsert);

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        skipped += batch.length;
      } else {
        synced += batch.length;
        console.log(`✅ Queued batch ${Math.floor(i / batchSize) + 1}: ${batch.length} users (${synced}/${usersToSync.length} total)`);
      }

      // Small delay to avoid overwhelming the database
      if (i + batchSize < usersToSync.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Queued: ${synced} users`);
    if (skipped > 0) {
      console.log(`   ⚠️  Skipped: ${skipped} users (errors)`);
    }
    console.log(`   📋 Already synced: ${profiles.length - usersToSync.length} users`);
    console.log(`   📦 Total users: ${profiles.length}`);

    console.log('\n🔄 Next steps:');
    console.log('   1. The mailerlite-process-queue Edge Function will process these automatically');
    console.log('   2. Or trigger it manually:');
    console.log('      curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/mailerlite-process-queue \\');
    console.log('        -H "Authorization: Bearer YOUR_CRON_SECRET"');
    console.log('   3. Check MailerLite dashboard to verify subscribers were added');
    console.log('   4. Monitor logs: supabase functions logs mailerlite-process-queue\n');

  } catch (error) {
    console.error('❌ Error syncing users to MailerLite:', error);
    process.exit(1);
  }
}

// Run the sync
syncUsersToMailerlite()
  .then(() => {
    console.log('✅ Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
