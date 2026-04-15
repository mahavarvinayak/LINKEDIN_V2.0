import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";
import type { GenerateResult } from "@/types";

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

ALWAYS respond in valid, minified JSON only. No markdown backticks. No explanation outside JSON. If you output markdown or conversation, the system will crash.`;

function buildUserPrompt(
  topic: string,
  role: string,
  topics: string[],
  goal: string,
  tone: string,
  audience: string
): string {
  return `Generate a LinkedIn post about this topic:
"""
${topic}
"""

User Persona:
- Role: ${role}
- Topics they post about: ${topics.join(", ")}
- Goal: ${goal}
- Tone: ${tone}
- Target audience: ${audience}

HIGH-PERFORMING LINKEDIN POST EXAMPLES (match this energy and structure):

EXAMPLE 1:
I turned down a 40 LPA offer last year.

Everyone thought I was crazy.

Here's why I don't regret it:

The company wanted me to build what they told me to.
Not what users needed.

I wanted to build something real.

So I joined a 5-person startup.
12 LPA. Scary as hell.

6 months later:
→ Shipped 3 products
→ Learned more than 3 years of corporate would've taught me
→ Found people who think like me

Money follows growth.
Not the other way around.

What would you have chosen?

EXAMPLE 2:
Nobody told me LinkedIn works like this.

Your first 50 posts will flop.

Not because you're bad.
Because the algorithm doesn't trust you yet.

Here's what changed everything for me:

→ Post at 6 PM Wednesday
→ Start with a line that makes them stop
→ Tell a story, not a fact
→ End with a question, not advice

Went from 200 to 12,000 followers in 8 months.

The content didn't change. The structure did.

What's your biggest LinkedIn struggle right now?

INSTRUCTIONS:
- Write in the user's tone and for their audience
- Do NOT mention their role/goal explicitly in the post
- 150-200 words maximum
- First line MUST be a scroll-stopping hook
- End with a question to drive comments
- Use line breaks after every 1-2 sentences
- Sound like a real human, not AI

Return ONLY this minified JSON (do not include markdown blocks):
{
  "post": "full post with \\n for line breaks",
  "hook_type": "curiosity|bold_claim|relatable|story|question",
  "estimated_scores": {
    "hook": 0-10,
    "readability": 0-10,
    "engagement": 0-10,
    "structure": 0-10
  },
  "best_time_to_post": "e.g. Wednesday 6 PM",
  "suggested_hashtags": ["tag1", "tag2"]
}`;
}

function tryParseJSON(text: string): GenerateResult | null {
  try {
    return JSON.parse(text) as GenerateResult;
  } catch {
    return null;
  }
}

function stripMarkdownAndParse(text: string): GenerateResult | null {
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

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";

    if (!topic) {
      return NextResponse.json(
        { error: "validation_error", message: "Topic is required." },
        { status: 400 }
      );
    }

    if (topic.length < 10) {
      return NextResponse.json(
        { error: "validation_error", message: "Topic must be at least 10 characters." },
        { status: 400 }
      );
    }

    if (topic.length > 500) {
      return NextResponse.json(
        { error: "validation_error", message: "Topic must be at most 500 characters." },
        { status: 400 }
      );
    }

    // 3. Check credits
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("credits_generate, streak_count, last_posted_at")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: "user_not_found", message: "User profile not found." },
        { status: 404 }
      );
    }

    if (userRow.credits_generate <= 0) {
      return NextResponse.json(
        { error: "no_credits", message: "You have no generate credits remaining." },
        { status: 402 }
      );
    }

    // Fetch persona (use defaults if not set)
    const { data: persona } = await supabase
      .from("personas")
      .select("role, topics, goal, tone, audience")
      .eq("user_id", user.id)
      .single();

    const role = persona?.role ?? "professional";
    const topics = persona?.topics ?? ["general"];
    const goal = persona?.goal ?? "followers";
    const tone = persona?.tone ?? "casual";
    const audience = persona?.audience ?? "professionals";

    // 4. Call OpenAI
    let aiContent: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.75,
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(topic, role, topics, goal, tone, audience),
          },
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
      const overallScore =
        (parsed.estimated_scores.hook +
          parsed.estimated_scores.readability +
          parsed.estimated_scores.engagement +
          parsed.estimated_scores.structure) /
        4;

      await supabase.from("posts").insert({
        user_id: user.id,
        type: "generated",
        topic: topic,
        improved_content: parsed.post,
        hook_score: parsed.estimated_scores.hook,
        readability_score: parsed.estimated_scores.readability,
        engagement_score: parsed.estimated_scores.engagement,
        structure_score: parsed.estimated_scores.structure,
        overall_score: parseFloat(overallScore.toFixed(1)),
        top_problems: [],
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
          credits_generate: Math.max(0, userRow.credits_generate - 1),
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
