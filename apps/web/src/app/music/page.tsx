"use client";
import { trpc } from "@/lib/trpc";
import { MusicPostCard } from "@/components/MusicPostCard";

export default function MusicPage() {
  const { data: posts, isLoading, error } = trpc.music.listPosts.useQuery();
  const { data: myLikes } = trpc.music.myLikes.useQuery(undefined, {
    retry: false,
    onError: () => {},
  });

  if (isLoading) return <p className="card">A carregar publicações de música…</p>;
  if (error) return <p className="card" style={{ color: "#c00" }}>Erro: {error.message}</p>;

  const likesByPost = Object.fromEntries(
    (myLikes ?? []).map((l) => [l.postId, l]),
  );

  return (
    <div>
      <div className="card">
        <h1>Música</h1>
        <p>
          Clica no <span style={{ color: "#e85d75" }}>♥</span> para identificar qualquer faixa — o
          sistema reconhece o áudio (estilo Shazam) e pesquisa automaticamente no Spotify.
        </p>
      </div>

      {posts?.length === 0 && (
        <div className="card">
          <p>Nenhuma publicação ainda. Corre <code>pnpm seed:music</code> para adicionar exemplos.</p>
        </div>
      )}

      <div className="music-feed">
        {posts?.map((post) => (
          <MusicPostCard
            key={post.id}
            post={post}
            initialLike={likesByPost[post.id] ?? null}
          />
        ))}
      </div>

      <style jsx>{`
        .music-feed {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
