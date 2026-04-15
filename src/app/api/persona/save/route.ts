import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be logged in." },
        { status: 401 }
      );
    }

    // 2. Validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_body", message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const { role, topics, goal, tone, audience } = body;

    // Validate role
    const validRoles = ["student", "founder", "freelancer", "job_seeker"];
    if (typeof role !== "string" || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid role selected." },
        { status: 400 }
      );
    }

    // Validate topics
    const validTopics = [
      "AI",
      "Startups",
      "Career",
      "Design",
      "Tech",
      "Marketing",
      "Finance",
      "Productivity",
    ];
    if (
      !Array.isArray(topics) ||
      topics.length === 0 ||
      !topics.every((t: unknown) => typeof t === "string" && validTopics.includes(t))
    ) {
      return NextResponse.json(
        { error: "validation_error", message: "Select at least one valid topic." },
        { status: 400 }
      );
    }

    // Validate goal
    const validGoals = ["followers", "leads", "job", "brand"];
    if (typeof goal !== "string" || !validGoals.includes(goal)) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid goal selected." },
        { status: 400 }
      );
    }

    // Validate tone
    const validTones = ["bold", "story", "educational", "casual"];
    if (typeof tone !== "string" || !validTones.includes(tone)) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid tone selected." },
        { status: 400 }
      );
    }

    // Validate audience
    const validAudiences = [
      "students",
      "founders",
      "recruiters",
      "developers",
      "general_professionals",
    ];
    if (typeof audience !== "string" || !validAudiences.includes(audience)) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid audience selected." },
        { status: 400 }
      );
    }

    // 3. Check if persona already exists — upsert
    const { data: existingPersona } = await supabase
      .from("personas")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingPersona) {
      // Update existing persona
      const { error: updateError } = await supabase
        .from("personas")
        .update({
          role,
          topics,
          goal,
          tone,
          audience,
        })
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json(
          { error: "db_error", message: "Failed to update persona." },
          { status: 500 }
        );
      }
    } else {
      // Insert new persona
      const { error: insertError } = await supabase.from("personas").insert({
        user_id: user.id,
        role,
        topics,
        goal,
        tone,
        audience,
      });

      if (insertError) {
        return NextResponse.json(
          { error: "db_error", message: "Failed to save persona." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
