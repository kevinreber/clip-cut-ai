import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ── Presence Avatars ──

interface PresenceAvatarsProps {
  projectId: Id<"projects">;
  onCursorUpdate?: (wordIndex: number | undefined) => void;
}

export function PresenceAvatars({ projectId }: PresenceAvatarsProps) {
  const presence = useQuery(api.collaboration.getPresence, { projectId });
  const updatePresence = useMutation(api.collaboration.updatePresence);
  const removePresence = useMutation(api.collaboration.removePresence);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heartbeat to keep presence alive
  useEffect(() => {
    updatePresence({ projectId });
    heartbeatRef.current = setInterval(() => {
      updatePresence({ projectId });
    }, 10_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      removePresence({ projectId });
    };
  }, [projectId]);

  if (!presence || presence.length === 0) return null;

  return (
    <div className="flex items-center gap-1" data-testid="presence-avatars">
      {presence.map((p) => (
        <div
          key={p._id}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: p.color }}
          title={`${p.userName}${p.cursorWordIndex !== undefined ? ` (word ${p.cursorWordIndex})` : ""}`}
          data-testid="presence-avatar"
        >
          {p.userName.charAt(0).toUpperCase()}
        </div>
      ))}
      <span className="ml-1 text-xs text-text-muted">
        {presence.length} collaborator{presence.length !== 1 ? "s" : ""} online
      </span>
    </div>
  );
}

// ── Share Dialog ──

interface ShareDialogProps {
  projectId: Id<"projects">;
  isOwner: boolean;
  onClose: () => void;
}

export function ShareDialog({ projectId, isOwner, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const collaborators = useQuery(api.collaboration.listCollaborators, {
    projectId,
  });
  const shareProject = useMutation(api.collaboration.shareProject);
  const removeCollaborator = useMutation(api.collaboration.removeCollaborator);

  const handleShare = useCallback(async () => {
    if (!email.trim()) return;
    setSharing(true);
    setShareError(null);
    setShareSuccess(false);
    try {
      await shareProject({ projectId, email: email.trim(), role });
      setShareSuccess(true);
      setEmail("");
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err: any) {
      setShareError(err.message || "Failed to share");
    } finally {
      setSharing(false);
    }
  }, [email, role, projectId, shareProject]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      data-testid="share-dialog"
    >
      <div
        className="w-full max-w-md rounded-xl border border-surface-lighter bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share Project</h2>
          <button
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        {isOwner && (
          <div className="mb-4">
            <label className="mb-1 block text-xs text-text-muted">
              Invite by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collaborator@example.com"
                className="flex-1 rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                data-testid="share-email-input"
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                className="rounded-lg border border-surface-lighter bg-surface-light px-2 py-2 text-sm text-white outline-none"
                data-testid="share-role-select"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleShare}
                disabled={sharing || !email.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
                data-testid="share-invite-btn"
              >
                {sharing ? "..." : "Invite"}
              </button>
            </div>
            {shareError && (
              <p className="mt-1 text-xs text-red-400">{shareError}</p>
            )}
            {shareSuccess && (
              <p className="mt-1 text-xs text-green-400">
                Invitation sent successfully!
              </p>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium text-text-muted">
            Collaborators
          </h3>
          {!collaborators || collaborators.length === 0 ? (
            <p className="text-xs text-text-muted/60">
              No collaborators yet. Invite someone above.
            </p>
          ) : (
            <div className="space-y-2" data-testid="collaborator-list">
              {collaborators.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light px-3 py-2"
                  data-testid="collaborator-item"
                >
                  <div>
                    <span className="text-sm text-white">{c.email}</span>
                    <span className="ml-2 rounded bg-surface-lighter px-1.5 py-0.5 text-[10px] text-text-muted">
                      {c.role}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() =>
                        removeCollaborator({ collaboratorId: c._id })
                      }
                      className="text-xs text-red-400 transition-colors hover:text-red-300"
                      data-testid="remove-collaborator-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Comments Panel ──

interface CommentsPanelProps {
  projectId: Id<"projects">;
  currentUserId: string;
  transcript?: { word: string; start: number }[];
  onJumpToWord?: (index: number) => void;
}

export function CommentsPanel({
  projectId,
  currentUserId,
  transcript,
  onJumpToWord,
}: CommentsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentWordIndex, setCommentWordIndex] = useState<string>("");
  const [showResolved, setShowResolved] = useState(false);

  const comments = useQuery(api.collaboration.listComments, { projectId });
  const addComment = useMutation(api.collaboration.addComment);
  const resolveComment = useMutation(api.collaboration.resolveComment);
  const deleteComment = useMutation(api.collaboration.deleteComment);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;
    const wordIdx = commentWordIndex ? parseInt(commentWordIndex, 10) : undefined;
    await addComment({
      projectId,
      wordIndex: isNaN(wordIdx as number) ? undefined : wordIdx,
      text: newComment.trim(),
    });
    setNewComment("");
    setCommentWordIndex("");
  }, [newComment, commentWordIndex, projectId, addComment]);

  const filteredComments = comments?.filter((c) =>
    showResolved ? true : !c.resolved
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="comments-panel"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Comments
          {comments && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              ({comments.filter((c) => !c.resolved).length} open)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved((s) => !s)}
            className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
            data-testid="toggle-resolved-btn"
          >
            {showResolved ? "Hide Resolved" : "Show Resolved"}
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-lighter px-4 py-3">
          {/* Add comment form */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-lg border border-surface-lighter bg-surface px-3 py-1.5 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
              data-testid="comment-input"
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            />
            <input
              type="number"
              value={commentWordIndex}
              onChange={(e) => setCommentWordIndex(e.target.value)}
              placeholder="Word #"
              className="w-20 rounded-lg border border-surface-lighter bg-surface px-2 py-1.5 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
              data-testid="comment-word-index"
              title="Optional: attach to a specific word index"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
              data-testid="add-comment-btn"
            >
              Add
            </button>
          </div>

          {/* Comment list */}
          {!filteredComments || filteredComments.length === 0 ? (
            <p className="text-xs text-text-muted/60">
              No comments yet. Start a discussion!
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="comment-list">
              {filteredComments.map((comment) => (
                <div
                  key={comment._id}
                  className={`rounded-lg border px-3 py-2 ${
                    comment.resolved
                      ? "border-green-800/30 bg-green-900/10"
                      : "border-surface-lighter bg-surface"
                  }`}
                  data-testid="comment-item"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">
                          {comment.userName}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        {comment.wordIndex !== undefined && transcript && (
                          <button
                            onClick={() => onJumpToWord?.(comment.wordIndex!)}
                            className="text-[10px] text-primary hover:underline"
                            data-testid="comment-jump-btn"
                          >
                            @{formatTime(transcript[comment.wordIndex]?.start ?? 0)}{" "}
                            &quot;{transcript[comment.wordIndex]?.word ?? ""}&quot;
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-text-muted">
                        {comment.text}
                      </p>
                      {comment.resolved && comment.resolvedBy && (
                        <p className="mt-0.5 text-[10px] text-green-400">
                          Resolved by {comment.resolvedBy}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!comment.resolved && (
                        <button
                          onClick={() =>
                            resolveComment({ commentId: comment._id })
                          }
                          className="text-[10px] text-green-400 hover:text-green-300"
                          data-testid="resolve-comment-btn"
                          title="Resolve"
                        >
                          ✓
                        </button>
                      )}
                      {comment.userId === currentUserId && (
                        <button
                          onClick={() =>
                            deleteComment({ commentId: comment._id })
                          }
                          className="text-[10px] text-red-400 hover:text-red-300"
                          data-testid="delete-comment-btn"
                          title="Delete"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
