"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Stagger, StaggerItem, PressScale } from "@/components/motion";
import { YouTubeEmbed } from "@/components/store/social/YouTubeEmbed";
import { youtubeEmbedId } from "@/lib/seo/youtube";
import { useTranslations } from "next-intl";

export type GalleryVideo = {
  id: string;
  title: string;
  youtubeUrl: string;
};

export function VideoGallery({ videos }: { videos: GalleryVideo[] }) {
  const t = useTranslations("videos");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = videos.find((video) => video.id === activeId) ?? null;

  return (
    <>
      <Stagger className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => {
          const thumbId = youtubeEmbedId(video.youtubeUrl);
          if (!thumbId) {
            return null;
          }
          return (
            <StaggerItem key={video.id}>
              <PressScale
                lift
                className="block overflow-hidden rounded-lg bg-card shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setActiveId(video.id)}
                  aria-label={t("playLabel", { title: video.title })}
                  className="group block w-full text-left"
                >
                  <div className="relative aspect-video overflow-hidden bg-ink/5">
                    <Image
                      src={`https://i.ytimg.com/vi/${thumbId}/hqdefault.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-base ease-standard group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/20 opacity-0 transition-opacity duration-fast group-hover:opacity-100">
                      <span className="flex size-12 items-center justify-center rounded-full bg-page/90 text-ink shadow-soft">
                        <Play aria-hidden="true" className="size-5 fill-current" />
                      </span>
                    </span>
                  </div>
                  <div className="p-4">
                    <h2 className="line-clamp-2 font-semibold text-ink">{video.title}</h2>
                  </div>
                </button>
              </PressScale>
            </StaggerItem>
          );
        })}
      </Stagger>
      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveId(null);
          }
        }}
        title={active?.title ?? ""}
        closeLabel={t("closeLabel")}
        size="lg"
      >
        {active ? <YouTubeEmbed url={active.youtubeUrl} title={active.title} /> : null}
      </Dialog>
    </>
  );
}
