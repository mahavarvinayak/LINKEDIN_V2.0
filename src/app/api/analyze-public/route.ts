import { NextResponse } from "next/server";
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

ALWAYS respond in valid, minified JSON only. No markdown backticks. No explanation outside JSON. If you output markdown or conversation, the system will crash.`;

function buildUserPrompt(post: string): string {
  return `Analyze this LinkedIn post:
"""
${post}
"""

User Persona:
- Role: professional
- Goal: followers
- Tone: casual

Return ONLY this minified JSON (do not include markdown blocks):
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
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return tryParseJSON(stripped);
}

export async function POST(request: Request) {
  try {
    // 1. Validate request body (no auth check — this is the public route)
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

    // 2. Call OpenAI
    let aiContent: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(post) },
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

    // 3. Parse JSON — retry once with backtick stripping
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

    // 4. Return result (no DB save for public route)
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
