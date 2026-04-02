"use client";

import { useState, useEffect, useCallback } from "react";

type Post = {
  id: string;
  content: string;
  created_at: string;
  author: string;
  registration_id: string;
};

type Props = {
  activityId: string;
  registrationId: string;
  onPostSubmitted?: () => void;
};

export default function DiscussionPanel({ activityId, registrationId, onPostSubmitted }: Props) {
  const [topic, setTopic] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadDiscussion = useCallback(async () => {
    try {
      const res = await fetch(`/api/discusiones?activity_id=${activityId}`);
      const json = await res.json();
      if (json.thread) {
        setThreadId(json.thread.id);
        setTopic(json.thread.topic);
      }
      setPosts(json.posts || []);
    } catch {}
    setLoading(false);
  }, [activityId]);

  useEffect(() => { loadDiscussion(); }, [loadDiscussion]);

  async function submitPost() {
    if (!threadId || !newPost.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/discusiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, registration_id: registrationId, content: newPost }),
      });
      const json = await res.json();
      if (json.post) {
        setPosts((prev) => [...prev, json.post]);
        setNewPost("");
        onPostSubmitted?.();
      }
    } catch {}
    setSubmitting(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) return <div className="text-center py-4 text-gray-400 text-sm">Cargando discusion...</div>;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Topic */}
      {topic && (
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-800">{topic}</p>
        </div>
      )}

      {/* Posts */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Se el primero en opinar</div>
        ) : (
          posts.map((p) => (
            <div key={p.id} className={`px-4 py-3 ${p.registration_id === registrationId ? "bg-blue-50/30" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#003366]">{p.author}</span>
                <span className="text-[10px] text-gray-400">{formatDate(p.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700">{p.content}</p>
            </div>
          ))
        )}
      </div>

      {/* New post */}
      <div className="border-t border-gray-200 p-3">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Escribe tu opinion..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={submitPost}
            disabled={submitting || !newPost.trim()}
            className="bg-[#0072CE] hover:bg-[#005fa3] text-white px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
