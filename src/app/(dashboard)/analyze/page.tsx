"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/shared/DashboardLayout";
import Paywall from "@/components/features/Paywall";
import { createClient } from "@/lib/supabase/client";
import type { AnalyzeResult } from "@/types";

type PageState = "input" | "loading" | "results";

function getScoreColor(score: number): string {
  if (score < 5) return "text-red-500";
  if (score <= 7) return "text-yellow-500";
  return "text-green-500";
}

function getScoreBg(score: number): string {
  if (score < 5) return "bg-red-500";
  if (score <= 7) return "bg-yellow-500";
  return "bg-green-500";
}

function getLabelBadge(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "weak") return "bg-red-100 text-red-700 border-red-200";
  if (lower === "average") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function getOverallText(score: number): string {
  if (score < 4) return "Your post needs work. Here's exactly why.";
  if (score < 6) return "Decent start, but there's room to improve.";
  if (score < 8) return "Good post! A few tweaks and it'll be great.";
  return "Excellent post! It's almost ready to go viral.";
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-7 w-16 bg-gray-200 rounded mb-3" />
      <div className="h-2 w-full bg-gray-100 rounded mb-3" />
      <div className="h-3 w-full bg-gray-200 rounded mb-1" />
      <div className="h-3 w-3/4 bg-gray-200 rounded" />
    </div>
  );
}

function SkeletonResults() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-10 space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <div className="h-12 w-32 bg-gray-200 rounded-lg" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="bg-gray-100 rounded-xl p-4 space-y-2">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 rounded" />
        <div className="h-3 w-4/6 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function ScoreCard({
  name,
  score,
  label,
  explanation,
}: {
  name: string;
  score: number;
  label: string;
  explanation: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 transition-shadow hover:shadow-md">
      <p className="text-sm text-gray-500 mb-1">{name}</p>
      <p className={`text-2xl font-semibold mb-2 ${getScoreColor(score)}`}>
        {score}/10
      </p>
      <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border mb-3 ${getLabelBadge(label)}`}
      >
        {label}
      </span>
      <div className="w-full h-1 bg-gray-100 rounded-full mb-3">
        <div
          className={`h-1 rounded-full transition-all duration-700 ${getScoreBg(score)}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{explanation}</p>
    </div>
  );
}

export default function AnalyzePage() {
  const [pageState, setPageState] = useState<PageState>("input");
  const [postText, setPostText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchCredits() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("credits_analyze")
        .eq("id", user.id)
        .single();
      if (data) {
        setCredits(data.credits_analyze || 0);
      } else {
        setCredits(0);
      }
    }
    
    fetchCredits();
    
    // Check if we came from create post page with a draft
    const sessionDraft = sessionStorage.getItem("analyze_draft");
    if (sessionDraft) {
      setPostText(sessionDraft);
      sessionStorage.removeItem("analyze_draft"); // clear it
    }
  }, [supabase]);

  const handleAnalyze = useCallback(async () => {
    setValidationError(null);
    setApiError(null);

    const trimmed = postText.trim();
    if (!trimmed || trimmed.length < 20) {
      setValidationError("Please paste a post first (min 20 characters)");
      return;
    }

    if (credits === 0) {
      setShowPaywall(true);
      return;
    }

    setPageState("loading");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setShowPaywall(true);
          setCredits(0);
        } else {
          setApiError(data.message || "Something went wrong. Please try again.");
        }
        setPageState("input");
        return;
      }

      setResult(data as AnalyzeResult);
      if (credits !== null) setCredits(credits - 1);
      setPageState("results");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
      setPageState("input");
    }
  }, [postText, credits]);

  const handleReset = useCallback(() => {
    setPageState("input");
    setResult(null);
    setApiError(null);
    setValidationError(null);
    setPostText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <DashboardLayout title="Analyze Post">
      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
      
      <div className="max-w-2xl mx-auto pt-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyze your post</h2>
        <p className="text-gray-500 mb-6">
          Get a personalized score and detailed feedback based on your persona.
        </p>

        <textarea
          id="post-textarea"
          value={postText}
          onChange={(e) => {
            setPostText(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="Paste your LinkedIn post here..."
          className={`w-full min-h-[12rem] border-2 rounded-xl p-4 text-base text-gray-900 placeholder-gray-400 outline-none resize-y transition-colors ${
            validationError
              ? "border-red-400 focus:border-red-500"
              : "border-gray-200 focus:border-blue-500"
          }`}
          disabled={pageState === "loading"}
        />

        {validationError && (
          <p className="text-sm text-red-500 mt-2">{validationError}</p>
        )}

        {apiError && (
          <p className="text-sm text-red-500 mt-2">{apiError}</p>
        )}

        {pageState === "input" && (
          <>
            <button
              onClick={handleAnalyze}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Analyze my post →
            </button>
            <p className="text-xs font-medium text-gray-500 text-center mt-3">
              ✦ {credits === null ? "..." : credits} credits remaining
            </p>
          </>
        )}

        {pageState === "loading" && (
          <>
            <div className="w-full mt-4 bg-gray-100 rounded-xl py-3 flex items-center justify-center gap-2 animate-pulse">
              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-500 font-medium">Analyzing your post...</span>
            </div>
            <SkeletonResults />
          </>
        )}
      </div>

      {pageState === "results" && result && (
        <div ref={resultsRef} className="max-w-2xl mx-auto pb-20 space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center">
            <p className={`text-5xl sm:text-6xl font-bold ${getScoreColor(result.overall_score)}`}>
              {result.overall_score.toFixed(1)} <span className="text-2xl text-gray-400 font-normal">/ 10</span>
            </p>
            <p className="text-gray-500 mt-2 text-sm">{getOverallText(result.overall_score)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScoreCard name="Hook Strength" score={result.scores.hook.score} label={result.scores.hook.label} explanation={result.scores.hook.explanation} />
            <ScoreCard name="Readability" score={result.scores.readability.score} label={result.scores.readability.label} explanation={result.scores.readability.explanation} />
            <ScoreCard name="Engagement" score={result.scores.engagement.score} label={result.scores.engagement.label} explanation={result.scores.engagement.explanation} />
            <ScoreCard name="Structure" score={result.scores.structure.score} label={result.scores.structure.label} explanation={result.scores.structure.explanation} />
          </div>

          {result.top_problems && result.top_problems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="text-red-700 font-medium mb-3">Why this post isn&apos;t performing as well</h3>
              <ul className="space-y-1.5">
                {result.top_problems.map((problem, i) => (
                  <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">→</span>
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.improved_post && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="text-blue-700 font-medium mb-3">Here&apos;s how it should look</h3>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed mb-4">
                {result.improved_post}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5">
                  Hook {result.scores.hook.score >= 7 ? result.scores.hook.score : "9"}/10 ✓
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5">
                  Engagement {result.scores.engagement.score >= 7 ? result.scores.engagement.score : "8"}/10 ✓
                </span>
              </div>
            </div>
          )}

          <div className="text-center pt-4">
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
            >
              ← Analyze another post
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
