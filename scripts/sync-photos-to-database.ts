/**
 * Utility script to sync athlete photos from storage to database
 * This script finds photos in storage and updates the player's photo_url
 *
 * Run with: npx tsx scripts/sync-photos-to-database.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ATHLETE_PHOTOS_BUCKET = "athlete-photos";

async function syncPhotosToDatabase() {
  console.log("🔍 Scanning storage for athlete photos...\n");

  try {
    // List all folders (player IDs) in the storage bucket
    const { data: folders, error: listError } = await supabase.storage
      .from(ATHLETE_PHOTOS_BUCKET)
      .list("", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      console.error("Error listing storage folders:", listError);
      return;
    }

    if (!folders || folders.length === 0) {
      console.log("No folders found in storage.");
      return;
    }

    console.log(`Found ${folders.length} player folders in storage\n`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const folder of folders) {
      // Folders in storage use 'name' property, not 'id'
      const playerId = folder.name;

      if (!playerId) {
        console.log(`⚠️  Skipping folder with no name:`, folder);
        continue;
      }

      // Skip if it's not a folder (folders don't have metadata)
      if (folder.metadata) {
        // This is a file, not a folder - skip it
        continue;
      }

      console.log(`\n📁 Processing folder: ${playerId}`);

      try {
        // List files in this player's folder
        const { data: files, error: filesError } = await supabase.storage
          .from(ATHLETE_PHOTOS_BUCKET)
          .list(playerId, {
            limit: 10,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (filesError) {
          console.error(
            `❌ Error listing files for player ${playerId}:`,
            filesError
          );
          errorCount++;
          continue;
        }

        if (!files || files.length === 0) {
          console.log(`   ⚠️  No files found in folder ${playerId}`);
          continue;
        }

        console.log(`   📸 Found ${files.length} file(s) in folder`);

        // Filter out folders (files have metadata, folders don't)
        const photoFiles = files.filter((file) => file.metadata);

        if (photoFiles.length === 0) {
          console.log(`   ⚠️  No photo files found (only folders)`);
          continue;
        }

        // Get the most recent photo
        const latestPhoto = photoFiles[0];
        const photoPath = `${playerId}/${latestPhoto.name}`;

        console.log(`   📷 Latest photo: ${latestPhoto.name}`);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage
          .from(ATHLETE_PHOTOS_BUCKET)
          .getPublicUrl(photoPath);

        console.log(`   🔗 Photo URL: ${publicUrl}`);

        // Check current player photo_url
        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("id, first_name, last_name, photo_url")
          .eq("id", playerId)
          .single();

        if (playerError) {
          console.error(
            `   ❌ Error fetching player ${playerId}:`,
            playerError
          );
          errorCount++;
          continue;
        }

        if (!player) {
          console.log(`   ⚠️  Player ${playerId} not found in database`);
          skippedCount++;
          continue;
        }

        console.log(`   👤 Player: ${player.first_name} ${player.last_name}`);
        console.log(`   📋 Current photo_url: ${player.photo_url || "NULL"}`);

        // Update if photo_url is missing or different
        if (player.photo_url !== publicUrl) {
          const { error: updateError } = await supabase
            .from("players")
            .update({ photo_url: publicUrl })
            .eq("id", playerId);

          if (updateError) {
            console.error(
              `   ❌ Error updating player ${playerId}:`,
              updateError
            );
            errorCount++;
          } else {
            console.log(
              `   ✅ Synced photo for ${player.first_name} ${player.last_name}`
            );
            syncedCount++;
          }
        } else {
          console.log(`   ⏭️  Skipped - photo_url already correct`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing player ${playerId}:`, error);
        errorCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

// Run the sync
syncPhotosToDatabase()
  .then(() => {
    console.log("\n✨ Sync complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Sync failed:", error);
    process.exit(1);
  });
