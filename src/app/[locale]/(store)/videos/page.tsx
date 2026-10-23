import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { VideoGallery } from "@/components/store/video/VideoGallery";
import { allPublishedHomeVideos } from "@/server/admin/content";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("videos");
  return buildMetadata({ title: t("metaTitle"), path: "/videos" });
}

// Homepage-teaser cadence (Phase 4's video block already uses the same
// refresh window) — editorial video content changes rarely.
export const revalidate = 300;

export default async function VideosPage() {
  const t = await getTranslations("videos");
  const common = await getTranslations("common");
  const videos = await allPublishedHomeVideos();

  return (
    <>
      <PageTitle
        title={t("pageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("pageTitle") }]}
      />
      {videos.length > 0 ? (
        <Container>
          <VideoGallery videos={videos} />
        </Container>
      ) : (
        <Container className="py-6">
          <p className="rounded-lg bg-card p-6 text-sm shadow-soft">{t("empty")}</p>
        </Container>
      )}
    </>
  );
}
