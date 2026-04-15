import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { post, type } = body;

    if (!post || typeof post !== "string") {
      return NextResponse.json(
        { error: "invalid_body", message: "Post content is required." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      original_content: post, // Storing in original_content or improved_content? The schema for draft might just be original_content or improved_content. Let's just store in original_content, or improved_content. Usually we store in both or just original. Wait, the previous API route 'generate' stores the generated post.
      improved_content: post, // Let's store in improved_content too so it shows up.
      type: type || "draft",
      is_saved: true,
    });

    if (insertError) {
      console.error("Draft save error", insertError);
      return NextResponse.json(
        { error: "db_error", message: "Failed to save draft." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", message: "Unexpected error occurred." },
      { status: 500 }
    );
  }
}
