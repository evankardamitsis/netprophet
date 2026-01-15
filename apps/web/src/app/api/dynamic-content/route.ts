import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const component = searchParams.get("component");
    const language = searchParams.get("language") || "en";

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let query = supabase
      .from("dynamic_content")
      .select("*")
      .eq("is_active", true)
      .eq("language", language);

    if (key) {
      query = query.eq("key", key);
    }

    if (component) {
      query = query.eq("component", component);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching dynamic content:", error);
      return NextResponse.json(
        { error: "Failed to fetch dynamic content" },
        { status: 500 }
      );
    }

    // If key is provided, return single item, otherwise return array
    if (key && data && data.length > 0) {
      return NextResponse.json({ content: data[0] });
    }

    return NextResponse.json({ contents: data || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
