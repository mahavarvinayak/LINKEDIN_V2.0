"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/shared/DashboardLayout";
import Paywall from "@/components/features/Paywall";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type PageState = "input" | "loading" | "results";

const EXAMPLE_TOPICS = [
  "I failed my first client pitch",
  "3 things I learned building my startup",
  "Why I left my corporate job",
  "My biggest mistake as a founder",
];

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();

  const [pageState, setPageState] = useState<PageState>("input");
  const [topic, setTopic] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [generatedPost, setGeneratedPost] = useState<any>(null); // From API /api/generate

  useEffect(() => {
    async function fetchCredits() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("credits_generate")
        .eq("id", user.id)
        .single();
      if (data) {
        setCredits(data.credits_generate || 0);
      } else {
        setCredits(0);
      }
    }
    fetchCredits();
  }, [supabase]);

  const handleGenerate = async () => {
    setError(null);
    const trimmed = topic.trim();
    if (!trimmed || trimmed.length < 10) {
      setError("Please describe a topic (min 10 characters).");
      return;
    }

    if (credits === 0) {
      setShowPaywall(true);
      return;
    }

    setPageState("loading");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setShowPaywall(true);
          setCredits(0);
        } else {
          setError(data.message || "Failed to generate post.");
        }
        setPageState("input");
        return;
      }

      setGeneratedPost(data);
      if (credits !== null) setCredits(credits - 1);
      setPageState("results");
    } catch {
      setError("Network error. Please try again.");
      setPageState("input");
    }
  };

  const handleSaveDraft = async () => {
    try {
      const dataToSave = {
        post: generatedPost.post,
        type: "draft",
        // Additional metadata if supported by your API
      };
      // We will assume /api/posts/save is taking standard post data.
      // Wait, the prompt says POST /api/posts/save with type='draft'
      const res = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (res.ok) {
        setToast({ message: "Saved as draft!", type: "success" });
      } else {
        setToast({ message: "Failed to save draft.", type: "error" });
      }
    } catch {
      setToast({ message: "Error saving draft.", type: "error" });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleAnalyzeThis = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("analyze_draft", generatedPost.post);
    }
    router.push("/analyze");
  };

  const getBestTime = () => {
    const today = new Date();
    const day = today.getDay();
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dName = names[day];
    
    // Quick pseudo-logic
    if (day === 3) return "Wednesday 6 PM";
    if (day === 4) return "Thursday 11 AM";
    if (day === 1) return "Monday 8 AM";
    if (day === 5) return "Friday 9 AM";
    return `${dName} 12 PM`;
  };

  return (
    <DashboardLayout title="Create Post">
      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
      
      <div className="max-w-2xl mx-auto pt-6 pb-12 animate-in fade-in zoom-in-95 duration-500">
        {(pageState === "input" || pageState === "loading") && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What do you want to post about?</h2>
            
            {credits === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-600 mb-4">You have 0 generate credits left.</p>
                <button
                  onClick={() => setShowPaywall(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Upgrade to continue
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Describe your topic, idea, or story..."
                  className="w-full min-h-[8rem] border-2 border-gray-200 focus:border-blue-500 rounded-xl p-4 text-base text-gray-900 placeholder-gray-400 outline-none resize-y transition-colors mb-3"
                  disabled={pageState === "loading"}
                />
                
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {EXAMPLE_TOPICS.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTopic(t)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                      disabled={pageState === "loading"}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <p className="text-xs font-medium text-gray-500 mb-3">
                  ✦ {credits === null ? "..." : credits} generate credits remaining
                </p>

                {pageState === "loading" ? (
                  <div className="w-full bg-gray-100 rounded-xl py-3 flex items-center justify-center gap-2 animate-pulse">
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm text-gray-500 font-medium">Generating your post...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-base font-medium transition-colors"
                  >
                    Generate post →
                  </button>
                )}
              </>
            )}
          </>
        )}

        {pageState === "results" && generatedPost && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Your generated post</h2>
            
            <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-sm">
              <p className="text-base text-gray-900 whitespace-pre-line leading-relaxed mb-6">
                {generatedPost.post}
              </p>
              
              <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded inline-flex">
                  Hook {generatedPost.estimated_scores?.hook || 8}/10
                </span>
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded inline-flex">
                  Readability {generatedPost.estimated_scores?.readability || 8}/10
                </span>
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded inline-flex">
                  Engagement {generatedPost.estimated_scores?.engagement || 9}/10
                </span>
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded inline-flex">
                  Structure {generatedPost.estimated_scores?.structure || 8}/10
                </span>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  📅 Best time: {getBestTime()}
                </span>
                {generatedPost.suggested_hashtags?.map((tag: string) => (
                  <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveDraft}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
              >
                Save as draft
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleAnalyzeThis}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Analyze this post
              </button>
            </div>
            
            <div className="pt-4 text-center">
              <button 
                onClick={() => {
                  setPageState("input");
                  setTopic("");
                }}
                className="text-sm text-gray-500 hover:text-gray-900 underline"
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
          toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? (
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </DashboardLayout>
  );
}
