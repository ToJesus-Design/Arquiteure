"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SpotifyLink } from "./SpotifyLink";

interface Post {
  id: string;
  title: string;
  artist: string | null;
  description: string | null;
  audioUrl: string | null;
  coverUrl: string | null;
  tags: string[];
}

interface LikeResult {
  like: {
    spotifyUrl: string | null;
    spotifyTrackId: string | null;
    coverUrl: string | null;
    previewUrl: string | null;
  };
  recognition: {
    title: string;
    artist: string;
    confidence: number;
    source: string;
    isrc?: string;
  };
  bestLink: {
    platform: string;
    url: string;
    trackId: string;
    previewUrl?: string;
    coverUrl?: string;
  } | null;
}

interface Props {
  post: Post;
  initialLike?: { spotifyUrl: string | null; spotifyTrackId: string | null; coverUrl: string | null; previewUrl: string | null } | null;
}

export function MusicPostCard({ post, initialLike }: Props) {
  const utils = trpc.useUtils();
  const [likeResult, setLikeResult] = useState<LikeResult | null>(null);
  const [liked, setLiked] = useState(!!initialLike?.spotifyUrl);

  const likeMutation = trpc.music.likePost.useMutation({
    onSuccess: (data) => {
      setLikeResult(data);
      setLiked(true);
      void utils.music.listPosts.invalidate();
    },
  });

  const unlikeMutation = trpc.music.unlikePost.useMutation({
    onSuccess: () => {
      setLikeResult(null);
      setLiked(false);
    },
  });

  const isLoading = likeMutation.isLoading || unlikeMutation.isLoading;

  function handleLike() {
    if (liked) {
      unlikeMutation.mutate({ postId: post.id });
    } else {
      likeMutation.mutate({ postId: post.id });
    }
  }

  const spotifyData =
    likeResult?.like.spotifyUrl
      ? {
          url: likeResult.like.spotifyUrl,
          trackId: likeResult.like.spotifyTrackId ?? "",
          coverUrl: likeResult.like.coverUrl ?? undefined,
          previewUrl: likeResult.like.previewUrl ?? undefined,
        }
      : initialLike?.spotifyUrl
      ? {
          url: initialLike.spotifyUrl,
          trackId: initialLike.spotifyTrackId ?? "",
          coverUrl: initialLike.coverUrl ?? undefined,
          previewUrl: initialLike.previewUrl ?? undefined,
        }
      : null;

  return (
    <article className="card music-card">
      <div className="music-header">
        {post.coverUrl && (
          <img
            src={post.coverUrl}
            alt={`${post.title} capa`}
            className="music-cover"
            width={64}
            height={64}
          />
        )}
        <div className="music-meta">
          <h3 className="music-title">{post.title}</h3>
          {post.artist && <p className="music-artist">{post.artist}</p>}
          {post.description && <p className="music-desc">{post.description}</p>}
          <div className="music-tags">
            {post.tags.map((t) => (
              <span key={t} className="pill ok">
                {t}
              </span>
            ))}
          </div>
        </div>
        <button
          className={`like-btn ${liked ? "liked" : ""}`}
          onClick={handleLike}
          disabled={isLoading}
          aria-label={liked ? "Remover like" : "Dar like e identificar música"}
          title={liked ? "Remover like" : "Like → identifica no Spotify"}
        >
          {isLoading ? (
            <span className="spinner" />
          ) : (
            <HeartIcon filled={liked} />
          )}
        </button>
      </div>

      {post.audioUrl && (
        <audio controls src={post.audioUrl} className="music-audio" aria-label="Áudio da publicação" />
      )}

      {likeMutation.isLoading && (
        <p className="music-identifying">A identificar música…</p>
      )}

      {likeResult?.recognition && likeResult.recognition.title && (
        <div className="recognition-badge">
          <span className="recognition-source">
            {likeResult.recognition.source === "acrcloud" ? "🎵 Shazam" : "📋 Metadados"}
          </span>
          <strong>{likeResult.recognition.title}</strong>
          {likeResult.recognition.artist && <span> — {likeResult.recognition.artist}</span>}
          {likeResult.recognition.isrc && (
            <span className="isrc"> ISRC: {likeResult.recognition.isrc}</span>
          )}
          <span className="confidence">
            {Math.round(likeResult.recognition.confidence * 100)}% confiança
          </span>
        </div>
      )}

      {spotifyData && (
        <SpotifyLink
          url={spotifyData.url}
          trackId={spotifyData.trackId}
          coverUrl={spotifyData.coverUrl}
          previewUrl={spotifyData.previewUrl}
        />
      )}

      {likeMutation.isError && (
        <p className="music-error">
          Erro ao identificar música. Tenta novamente.
        </p>
      )}

      <style jsx>{`
        .music-card { position: relative; }
        .music-header { display: flex; gap: 14px; align-items: flex-start; }
        .music-cover { border-radius: 6px; object-fit: cover; flex-shrink: 0; }
        .music-meta { flex: 1; min-width: 0; }
        .music-title { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
        .music-artist { margin: 0 0 4px; color: #555; font-size: 14px; }
        .music-desc { margin: 0 0 6px; color: #666; font-size: 13px; }
        .music-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .music-audio { width: 100%; margin-top: 10px; }
        .music-identifying { color: #888; font-size: 13px; margin: 8px 0 0; }
        .music-error { color: #c00; font-size: 13px; margin: 8px 0 0; }
        .like-btn {
          background: none;
          border: 1px solid #ddd;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
        }
        .like-btn:hover { border-color: #e85d75; background: #fff0f2; }
        .like-btn.liked { border-color: #e85d75; background: #fff0f2; }
        .like-btn:disabled { opacity: 0.6; cursor: wait; }
        .recognition-badge {
          margin-top: 10px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 13px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .recognition-source { font-size: 12px; background: #e3e3e5; border-radius: 4px; padding: 2px 6px; }
        .isrc { color: #888; font-size: 11px; }
        .confidence { color: #888; font-size: 11px; margin-left: auto; }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e85d75;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </article>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#e85d75" : "none"} stroke="#e85d75" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
