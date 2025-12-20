import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@netprophet/lib";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;

    // Get player information to find the associated user
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("claimed_by_user_id, first_name, last_name, is_active")
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (!player.claimed_by_user_id) {
      return NextResponse.json(
        {
          error:
            "Player is not linked to a user. Please link the player to a user first.",
        },
        { status: 400 }
      );
    }

    if (!player.is_active) {
      return NextResponse.json(
        {
          error:
            "Player profile is not active. Please activate the player first.",
        },
        { status: 400 }
      );
    }

    // Call the database function to send the notification
    const { data, error } = await supabase.rpc(
      "send_profile_activated_notification",
      {
        user_id_param: player.claimed_by_user_id,
        player_id_param: playerId,
      }
    );

    if (error) {
      console.error("Error sending profile activation notification:", error);
      return NextResponse.json(
        { error: "Failed to send notification", details: error.message },
        { status: 500 }
      );
    }

    // Create in-app notification for profile activation
    try {
      const playerName = `${player.first_name} ${player.last_name}`;
      const { error: notificationError } = await supabase.rpc(
        "create_admin_notification",
        {
          p_type: "profile_activated",
          p_title: "Profile Activated",
          p_message: `Athlete profile activated for ${playerName}`,
          p_severity: "success",
          p_metadata: {
            user_id: player.claimed_by_user_id,
            player_id: playerId,
            player_name: playerName,
          },
        }
      );
      if (notificationError) {
        console.error(
          "Error creating activation notification:",
          notificationError
        );
      }
    } catch (notificationError) {
      // Don't fail if notification creation fails
      console.error(
        "Error creating activation notification:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,
      message: `Profile activation notification sent to user for ${player.first_name} ${player.last_name}`,
    });
  } catch (error) {
    console.error("Error in notify-activation route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
