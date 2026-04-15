import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // 2. Fetch credits from users table
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("credits_analyze, credits_generate, plan")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: "user_not_found", message: "User profile not found." },
        { status: 404 }
      );
    }

    // 3. Return credits
    return NextResponse.json({
      credits_analyze: userRow.credits_analyze,
      credits_generate: userRow.credits_generate,
      plan: userRow.plan,
    });
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
