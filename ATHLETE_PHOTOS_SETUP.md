# Athlete Photos Setup Guide

This guide walks you through setting up Supabase storage for athlete photos and using the upload functionality.

## Step 1: Run the Database Migration

The migration creates the storage bucket and sets up the necessary policies:

```bash
# Apply the migration to your database
supabase db push
# Or if using production database directly, run the migration file:
# supabase/migrations/20251220170000_create_athlete_photos_storage_bucket.sql
```

This migration:

- Creates a public `athlete-photos` bucket
- Sets 5MB file size limit
- Allows image types: JPEG, JPG, PNG, WEBP
- Sets up policies for public read and authenticated write

## Step 2: Storage Bucket Configuration

The bucket is configured with:

- **Bucket ID**: `athlete-photos`
- **Public**: `true` (images accessible without authentication)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

## Step 3: Using the Storage Functions

### Upload a Photo

```typescript
import { uploadAthletePhoto } from '@netprophet/lib';

const file = // File object from input
const playerId = 'player-uuid-here';

const result = await uploadAthletePhoto(file, playerId);

if (result.success) {
  // Update player with photo URL
  await updatePlayer(playerId, { photoUrl: result.publicUrl });
} else {
  console.error('Upload failed:', result.error);
}
```

### Get Photo URL

```typescript
import { getAthletePhotoUrl } from "@netprophet/lib";

const filePath = "player-id/filename.jpg";
const publicUrl = getAthletePhotoUrl(filePath);
```

### Delete a Photo

```typescript
import { deleteAthletePhoto } from "@netprophet/lib";

const filePath = "player-id/filename.jpg";
const result = await deleteAthletePhoto(filePath);
```

### Delete All Player Photos

```typescript
import { deleteAllPlayerPhotos } from "@netprophet/lib";

const playerId = "player-uuid-here";
const result = await deleteAllPlayerPhotos(playerId);
```

## Step 4: Admin Interface

The admin player edit page (`/players/[id]`) includes photo upload functionality:

- Upload new photo
- Preview current photo
- Replace existing photo
- Delete photo

## Storage Structure

Photos are stored in the following structure:

```
athlete-photos/
  └── {playerId}/
      └── {playerId}-{timestamp}.{ext}
```

Example:

```
athlete-photos/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── 123e4567-e89b-12d3-a456-426614174000-1703123456789.jpg
```

## Public URL Format

Public URLs are generated automatically and follow this format:

```
https://{project-ref}.supabase.co/storage/v1/object/public/athlete-photos/{playerId}/{filename}
```

## Security

- **Read Access**: Public (anyone can view photos)
- **Write Access**: Authenticated users only (admin interface)
- **File Validation**: Type and size validation on upload
- **RLS Policies**: Enforced at the storage level

## Troubleshooting

### Upload Fails

- Check file size (must be < 5MB)
- Verify file type (JPEG, PNG, or WEBP)
- Ensure user is authenticated
- Check browser console for detailed errors

### Photo Not Displaying

- Verify the `photo_url` field is set in the players table
- Check that the URL is accessible (public bucket)
- Ensure the file path is correct

### Migration Issues

- Ensure you have the latest migration applied
- Check Supabase dashboard for bucket creation
- Verify storage policies are active

## Next Steps

1. Run the migration
2. Test upload functionality in admin interface
3. Verify photos display correctly on player cards
4. Upload photos for existing players as needed
