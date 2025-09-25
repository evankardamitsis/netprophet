import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", resolvedParams.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching email template:", error);
      return NextResponse.json(
        { error: "Failed to fetch template" },
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    // Update template
    const { data, error } = await supabase
      .from("email_templates")
      .update({
        name: body.name,
        type: body.type,
        language: body.language,
        subject: body.subject,
        html_content: body.html_content,
        text_content: body.text_content || null,
        variables: body.variables || {},
        is_active: body.is_active !== undefined ? body.is_active : true,
        version: body.version || 1,
      })
      .eq("id", resolvedParams.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating email template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("email_templates")
      .update({ is_active: false })
      .eq("id", resolvedParams.id);

    if (error) {
      console.error("Error deleting email template:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
