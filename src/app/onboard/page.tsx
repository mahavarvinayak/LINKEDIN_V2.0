"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ─── Option Definitions ─── */
const ROLES = [
  { value: "student", label: "Student" },
  { value: "founder", label: "Founder" },
  { value: "freelancer", label: "Freelancer" },
  { value: "job_seeker", label: "Job Seeker" },
] as const;

const TOPICS = [
  "AI",
  "Startups",
  "Career",
  "Design",
  "Tech",
  "Marketing",
  "Finance",
  "Productivity",
] as const;

const GOALS = [
  { value: "followers", label: "Get followers" },
  { value: "leads", label: "Generate leads" },
  { value: "job", label: "Find a job" },
  { value: "brand", label: "Build my brand" },
] as const;

const TONES = [
  { value: "bold", label: "Bold & direct" },
  { value: "story", label: "Storytelling" },
  { value: "educational", label: "Educational" },
  { value: "casual", label: "Casual & friendly" },
] as const;

const AUDIENCES = [
  { value: "students", label: "Students" },
  { value: "founders", label: "Founders" },
  { value: "recruiters", label: "Recruiters" },
  { value: "developers", label: "Developers" },
  { value: "general_professionals", label: "General professionals" },
] as const;

/* ─── Pill Button Component ─── */
function PillButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Main Onboard Page ─── */
export default function OnboardPage() {
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [audience, setAudience] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isFormValid =
    role !== null &&
    selectedTopics.length > 0 &&
    goal !== null &&
    tone !== null &&
    audience !== null;

  const toggleTopic = useCallback((topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/persona/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          topics: selectedTopics,
          goal,
          tone,
          audience,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }, [isFormValid, isSubmitting, role, selectedTopics, goal, tone, audience, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          {/* Progress */}
          <div className="mb-6">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
              Step 1 of 1 — Tell us about yourself
            </p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-1.5 bg-blue-600 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    ([role, selectedTopics.length > 0, goal, tone, audience].filter(
                      Boolean
                    ).length /
                      5) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Personalize your experience
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            30 seconds. Every post becomes tailored after this.
          </p>

          {/* Sections */}
          <div className="space-y-7">
            {/* Section 1 — Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a...
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <PillButton
                    key={r.value}
                    label={r.label}
                    selected={role === r.value}
                    onClick={() => setRole(r.value)}
                  />
                ))}
              </div>
            </div>

            {/* Section 2 — Topics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I post about...{" "}
                <span className="text-gray-400 font-normal">(select multiple)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <PillButton
                    key={topic}
                    label={topic}
                    selected={selectedTopics.includes(topic)}
                    onClick={() => toggleTopic(topic)}
                  />
                ))}
              </div>
            </div>

            {/* Section 3 — Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                My goal is to...
              </label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <PillButton
                    key={g.value}
                    label={g.label}
                    selected={goal === g.value}
                    onClick={() => setGoal(g.value)}
                  />
                ))}
              </div>
            </div>

            {/* Section 4 — Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                My writing tone is...
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <PillButton
                    key={t.value}
                    label={t.label}
                    selected={tone === t.value}
                    onClick={() => setTone(t.value)}
                  />
                ))}
              </div>
            </div>

            {/* Section 5 — Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I&apos;m writing for...
              </label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <PillButton
                    key={a.value}
                    label={a.label}
                    selected={audience === a.value}
                    onClick={() => setAudience(a.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Server Error */}
          {serverError && (
            <p className="text-sm text-red-500 text-center mt-4">{serverError}</p>
          )}

          {/* Submit Button */}
          <button
            id="onboard-submit-button"
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={handleSubmit}
            className={`w-full mt-8 flex items-center justify-center gap-2 rounded-xl py-3 text-base font-medium transition-all ${
              isFormValid && !isSubmitting
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isSubmitting ? "Saving..." : "Open my dashboard →"}
          </button>
        </div>
      </div>
    </div>
  );
}
