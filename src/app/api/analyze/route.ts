import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";
import type { AnalyzeResult } from "@/types";

const SYSTEM_PROMPT = `You are an expert LinkedIn Growth Strategist with 10+ years of experience helping founders, students, freelancers, and job seekers grow on LinkedIn. You have studied 500,000+ LinkedIn posts. You know exactly why some posts go viral and others get ignored.

YOUR RULES:
- Write like a real human, not a robot
- Short punchy lines. Never write walls of text.
- No corporate buzzwords (leverage, synergy, holistic, empower, innovative, game-changer)
- No filler phrases (Great question!, Certainly!, Of course!)
- No motivational clichés (Believe in yourself, Keep going, Work hard)
- Sound like a senior mentor, not an AI assistant

SCORING CRITERIA:
Hook Strength (0-10): Does first line stop the scroll? Bold claim, curiosity, or relatable?
  9-10: Creates strong curiosity or makes reader stop immediately
  7-8: Good hook, could be punchier
  5-6: Average opener, doesn't compel reading
  3-4: Generic, weak opening
  0-2: No hook at all, starts with 'I' or a statement

Readability (0-10): Short lines? Easy to skim on mobile? Whitespace?
  9-10: Perfect line breaks, easy to skim, great whitespace
  7-8: Mostly readable, minor density issues
  5-6: Some long paragraphs, hard to skim
  3-4: Dense wall of text
  0-2: Completely unreadable block

Engagement Potential (0-10): Emotional trigger? Ends with question?
  9-10: Strong emotion + ends with specific question
  7-8: Good emotion, weak or no CTA
  5-6: Some emotion, no question
  3-4: Flat, no emotional pull
  0-2: Nothing to engage with

Structure (0-10): Hook → Body → Lesson → CTA flow?
  9-10: Perfect narrative arc
  7-8: Good flow, one section weak
  5-6: Partial structure
  3-4: No clear flow
  0-2: Random, disconnected

ALWAYS respond in valid JSON only. No markdown backticks. No explanation outside JSON.`;

function buildUserPrompt(post: string, role: string, goal: string, tone: string): string {
  return `Analyze this LinkedIn post:
"""
${post}
"""

User Persona:
- Role: ${role}
- Goal: ${goal}
- Tone: ${tone}

Return ONLY valid, minified JSON (no other text). If you output markdown backticks or any conversation, the system will crash.
{
  "scores": {
    "hook": { "score": 0-10, "label": "Weak|Average|Good|Strong", "explanation": "specific 1-2 sentences about THIS post's hook" },
    "readability": { "score": 0-10, "label": "Weak|Average|Good|Strong", "explanation": "specific 1-2 sentences" },
    "engagement": { "score": 0-10, "label": "Weak|Average|Good|Strong", "explanation": "specific 1-2 sentences" },
    "structure": { "score": 0-10, "label": "Weak|Average|Good|Strong", "explanation": "specific 1-2 sentences" }
  },
  "overall_score": 0.0,
  "top_problems": ["specific problem 1", "specific problem 2", "specific problem 3"],
  "improved_post": "full rewritten post using \\n for line breaks, 150-200 words",
  "improvement_summary": "one sentence: what changed and why it works better"
}`;
}

function tryParseJSON(text: string): AnalyzeResult | null {
  try {
    return JSON.parse(text) as AnalyzeResult;
  } catch {
    return null;
  }
}

function stripMarkdownAndParse(text: string): AnalyzeResult | null {
  // Strip markdown code fences like ```json ... ``` or ``` ... ```
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return tryParseJSON(stripped);
}

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

    const post = typeof body.post === "string" ? body.post.trim() : "";

    if (!post) {
      return NextResponse.json(
        { error: "validation_error", message: "Post content is required." },
        { status: 400 }
      );
    }

    if (post.length < 20) {
      return NextResponse.json(
        { error: "validation_error", message: "Post must be at least 20 characters." },
        { status: 400 }
      );
    }

    if (post.length > 3000) {
      return NextResponse.json(
        { error: "validation_error", message: "Post must be at most 3000 characters." },
        { status: 400 }
      );
    }

    // 3. Check credits
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("credits_analyze, streak_count, last_posted_at")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: "user_not_found", message: "User profile not found." },
        { status: 404 }
      );
    }

    if (userRow.credits_analyze <= 0) {
      return NextResponse.json(
        { error: "no_credits", message: "You have no analyze credits remaining." },
        { status: 402 }
      );
    }

    // Fetch persona (use defaults if not set)
    const { data: persona } = await supabase
      .from("personas")
      .select("role, goal, tone")
      .eq("user_id", user.id)
      .single();

    const role = persona?.role ?? "professional";
    const goal = persona?.goal ?? "followers";
    const tone = persona?.tone ?? "casual";

    // 4. Call OpenAI
    let aiContent: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(post, role, goal, tone) },
        ],
      });

      aiContent = completion.choices[0]?.message?.content ?? "";
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error &&
        (err.message.includes("timeout") || err.message.includes("ETIMEDOUT"));

      if (isTimeout) {
        return NextResponse.json(
          { error: "ai_timeout", message: "AI service timed out. Please try again." },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: "ai_error", message: "Failed to get AI response. Please try again." },
        { status: 500 }
      );
    }

    // 5. Parse JSON — retry once with backtick stripping
    let parsed = tryParseJSON(aiContent);
    if (!parsed) {
      parsed = stripMarkdownAndParse(aiContent);
    }

    if (!parsed) {
      return NextResponse.json(
        { error: "parse_error", message: "Failed to parse AI response." },
        { status: 500 }
      );
    }

    // 6. Save to posts table (don't fail if DB save fails)
    try {
      await supabase.from("posts").insert({
        user_id: user.id,
        type: "analyzed",
        original_content: post,
        improved_content: parsed.improved_post,
        hook_score: parsed.scores.hook.score,
        readability_score: parsed.scores.readability.score,
        engagement_score: parsed.scores.engagement.score,
        structure_score: parsed.scores.structure.score,
        overall_score: parsed.overall_score,
        top_problems: parsed.top_problems,
        improvement_summary: parsed.improvement_summary,
      });
    } catch {
      // DB error — still return AI result
    }

    // 7. Decrement credits and update streak (don't fail if DB update fails)
    try {
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      let newStreak = userRow.streak_count || 0;
      let newLastPostedAt = today.toISOString();

      if (userRow.last_posted_at) {
        const lastPosted = new Date(userRow.last_posted_at);
        const lastPostedDate = new Date(lastPosted.getFullYear(), lastPosted.getMonth(), lastPosted.getDate()).getTime();
        const diffDays = Math.floor((todayDate - lastPostedDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      await supabase
        .from("users")
        .update({ 
          credits_analyze: Math.max(0, userRow.credits_analyze - 1),
          streak_count: newStreak,
          last_posted_at: newLastPostedAt
        })
        .eq("id", user.id);
    } catch {
      // DB error — still return AI result
    }

    // 8. Return result
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
