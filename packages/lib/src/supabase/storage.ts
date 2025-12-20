import { supabase } from "./client";

const ATHLETE_PHOTOS_BUCKET = "athlete-photos";

export interface UploadPhotoResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface DeletePhotoResult {
  success: boolean;
  error?: string;
}

/**
 * Upload an athlete photo to Supabase storage
 * @param file - The image file to upload
 * @param playerId - The ID of the player/athlete
 * @param fileName - Optional custom file name (defaults to playerId with extension)
 * @returns Result with path and public URL
 */
export async function uploadAthletePhoto(
  file: File,
  playerId: string,
  fileName?: string
): Promise<UploadPhotoResult> {
  try {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size exceeds 5MB limit",
      };
    }

    // Generate file name if not provided
    const fileExtension = file.name.split(".").pop() || "jpg";
    const finalFileName =
      fileName || `${playerId}-${Date.now()}.${fileExtension}`;
    const filePath = `${playerId}/${finalFileName}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(ATHLETE_PHOTOS_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Error uploading photo:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(ATHLETE_PHOTOS_BUCKET).getPublicUrl(filePath);

    return {
      success: true,
      path: filePath,
      publicUrl,
    };
  } catch (error) {
    console.error("Unexpected error uploading photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload photo",
    };
  }
}

/**
 * Get the public URL for an athlete photo
 * @param filePath - The storage path to the file
 * @returns Public URL string
 */
export function getAthletePhotoUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(ATHLETE_PHOTOS_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete an athlete photo from storage
 * @param filePath - The storage path to the file
 * @returns Result indicating success or failure
 */
export async function deleteAthletePhoto(
  filePath: string
): Promise<DeletePhotoResult> {
  try {
    const { error } = await supabase.storage
      .from(ATHLETE_PHOTOS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("Error deleting photo:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected error deleting photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete photo",
    };
  }
}

/**
 * Delete all photos for a specific player
 * @param playerId - The ID of the player
 * @returns Result indicating success or failure
 */
export async function deleteAllPlayerPhotos(
  playerId: string
): Promise<DeletePhotoResult> {
  try {
    // List all files in the player's folder
    const { data: files, error: listError } = await supabase.storage
      .from(ATHLETE_PHOTOS_BUCKET)
      .list(playerId);

    if (listError) {
      console.error("Error listing photos:", listError);
      return {
        success: false,
        error: listError.message,
      };
    }

    if (!files || files.length === 0) {
      return {
        success: true,
      };
    }

    // Delete all files
    const filePaths = files.map((file) => `${playerId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(ATHLETE_PHOTOS_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error("Error deleting photos:", deleteError);
      return {
        success: false,
        error: deleteError.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected error deleting player photos:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete player photos",
    };
  }
}

/**
 * Check if a file exists in storage
 * @param filePath - The storage path to check
 * @returns True if file exists, false otherwise
 */
export async function photoExists(filePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(ATHLETE_PHOTOS_BUCKET)
      .list(filePath.split("/")[0], {
        search: filePath.split("/")[1],
      });

    if (error) {
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    return false;
  }
}
