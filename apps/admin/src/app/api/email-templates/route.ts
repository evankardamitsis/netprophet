import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("type", { ascending: true })
      .order("language", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching email templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.name ||
      !body.type ||
      !body.language ||
      !body.subject ||
      !body.html_content
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, type, language, subject, html_content",
        },
        { status: 400 }
      );
    }

    // Create template
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        name: body.name,
        type: body.type,
        language: body.language,
        subject: body.subject,
        html_content: body.html_content,
        text_content: body.text_content || null,
        variables: body.variables || {},
        is_active: body.is_active !== undefined ? body.is_active : true,
        version: 1,
        created_by: body.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating email template:", error);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
