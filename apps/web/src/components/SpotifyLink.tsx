"use client";

interface Props {
  url: string;
  previewUrl?: string;
  coverUrl?: string;
  trackId: string;
}

export function SpotifyLink({ url, previewUrl, coverUrl, trackId }: Props) {
  return (
    <div className="spotify-badge">
      {coverUrl && (
        <img
          src={coverUrl}
          alt="Capa do álbum"
          className="spotify-cover"
          width={48}
          height={48}
        />
      )}
      <div className="spotify-info">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="spotify-open-btn"
          aria-label="Abrir no Spotify"
        >
          <SpotifyIcon />
          Abrir no Spotify
        </a>
        {previewUrl && (
          <audio
            controls
            src={previewUrl}
            className="spotify-preview"
            aria-label="Pré-escuta de 30 segundos"
          />
        )}
      </div>
      <style jsx>{`
        .spotify-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #121212;
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: 10px;
        }
        .spotify-cover {
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .spotify-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .spotify-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1db954;
          color: #fff;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          width: fit-content;
          white-space: nowrap;
        }
        .spotify-open-btn:hover {
          background: #1ed760;
        }
        .spotify-preview {
          width: 180px;
          height: 28px;
        }
      `}</style>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
