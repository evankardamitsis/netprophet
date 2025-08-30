import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export interface AdminAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  error?: string;
}

/**
 * Authenticates and authorizes admin users for API routes
 * This function validates the JWT token and checks admin privileges
 */
export async function authenticateAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        error: "Missing or invalid authorization header",
      };
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        error: "Server configuration error",
      };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the JWT token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        error: "Invalid or expired token",
      };
    }

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        isAuthenticated: true,
        isAdmin: false,
        userId: user.id,
        error: "User profile not found",
      };
    }

    // Check admin privileges
    if (!profile.is_admin) {
      return {
        isAuthenticated: true,
        isAdmin: false,
        userId: user.id,
        error: "Admin privileges required",
      };
    }

    return {
      isAuthenticated: true,
      isAdmin: true,
      userId: user.id,
    };
  } catch (error) {
    console.error("Admin authentication error:", error);
    return {
      isAuthenticated: false,
      isAdmin: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Middleware function to protect admin API routes
 * Returns appropriate error responses for unauthorized requests
 */
export async function requireAdmin(request: NextRequest) {
  const authResult = await authenticateAdmin(request);

  if (!authResult.isAuthenticated) {
    return {
      success: false,
      error: authResult.error || "Authentication required",
      status: 401,
    };
  }

  if (!authResult.isAdmin) {
    return {
      success: false,
      error: authResult.error || "Admin privileges required",
      status: 403,
    };
  }

  return {
    success: true,
    userId: authResult.userId,
  };
}
