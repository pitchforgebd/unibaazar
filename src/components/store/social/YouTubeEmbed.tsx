import { youtubeEmbedId } from "@/lib/seo/youtube";

export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const id = youtubeEmbedId(url);
  if (!id) {
    return null;
  }
  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-ink/5 shadow-soft">
      <iframe
        title={title}
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
