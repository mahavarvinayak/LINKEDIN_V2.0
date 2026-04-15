"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Bookmark, Trash2, Eye, X } from "lucide-react";
import Link from "next/link";

type DraftPost = {
  id: string;
  created_at: string;
  type: string;
  original_content?: string;
  improved_content?: string;
};

export default function DraftsPage() {
  const supabase = createClient();
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewPost, setViewPost] = useState<DraftPost | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadDrafts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .or("is_saved.eq.true,type.eq.draft")
        .order("created_at", { ascending: false });

      setDrafts(data || []);
      setIsLoading(false);
    }
    loadDrafts();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    
    // Optimistic UI update
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    
    await supabase.from("posts").delete().eq("id", id);
  };

  const getPreview = (post: DraftPost) => {
    const text = post.improved_content || post.original_content || "";
    if (text.length > 100) return text.substring(0, 100) + "...";
    return text;
  };

  const badgeColor = (type: string) => {
    if (type === "generated") return "bg-blue-100 text-blue-700";
    if (type === "analyzed") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700"; // draft
  };

  return (
    <DashboardLayout title="Saved Drafts">
      <div className="max-w-4xl mx-auto pt-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64 animate-pulse">
            <p className="text-gray-400">Loading drafts...</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded-2xl h-80 text-center px-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Bookmark className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved drafts yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              Save your generated posts line-by-line, and they will appear here for future reference.
            </p>
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Create your first post →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor(draft.type)} capitalize`}>
                    {draft.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(draft.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed flex-1 mb-6">
                  {getPreview(draft)}
                </p>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button
                    onClick={() => setViewPost(draft)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {viewPost.type} Post
              </h3>
              <button
                onClick={() => setViewPost(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {viewPost.improved_content || viewPost.original_content}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-white flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewPost.improved_content || viewPost.original_content || "");
                  setToast({ message: "Copied to clipboard!", type: "success" });
                  setTimeout(() => setToast(null), 3000);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        </div>
      )}

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
