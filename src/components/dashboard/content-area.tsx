"use client";

import { lazy, Suspense, type ComponentType } from "react";
import { useArchive } from "@/lib/archive/archive-store";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionPlaceholder } from "./section-placeholder";
import SectionErrorBoundary from "./section-error-boundary";

type SectionComponent = ComponentType<{ archive: ParsedArchive }>;

const SECTION_MAP: Record<
  string,
  React.LazyExoticComponent<SectionComponent>
> = {
  "algorithmic-mirror": lazy(
    () => import("@/components/sections/algorithmic-mirror"),
  ),
  "ad-price-tag": lazy(() => import("@/components/sections/ad-price-tag")),
  wrapped: lazy(() => import("@/components/sections/wrapped")),
  overview: lazy(() => import("@/components/sections/overview")),
  "activity-patterns": lazy(
    () => import("@/components/sections/activity-patterns"),
  ),
  interests: lazy(() => import("@/components/sections/interests")),
  "ad-profile": lazy(() => import("@/components/sections/ad-profile")),
  "ad-targeting": lazy(() => import("@/components/sections/ad-targeting")),
  "login-history": lazy(() => import("@/components/sections/login-history")),
  "ip-analysis": lazy(() => import("@/components/sections/ip-analysis")),
  devices: lazy(() => import("@/components/sections/devices")),
  "connected-apps": lazy(() => import("@/components/sections/connected-apps")),
  grok: lazy(() => import("@/components/sections/grok-conversations")),
  demographics: lazy(() => import("@/components/sections/demographics")),
  "off-twitter": lazy(() => import("@/components/sections/off-twitter")),
  tweets: lazy(() => import("@/components/sections/tweets")),
  likes: lazy(() => import("@/components/sections/likes")),
  dms: lazy(() => import("@/components/sections/dms")),
  "social-graph": lazy(() => import("@/components/sections/social-graph")),
  conversations: lazy(() => import("@/components/sections/conversations")),
  lists: lazy(() => import("@/components/sections/lists")),
  media: lazy(() => import("@/components/sections/media-gallery")),
  profile: lazy(() => import("@/components/sections/profile")),
  "username-history": lazy(
    () => import("@/components/sections/username-history"),
  ),
  "deleted-tweets": lazy(() => import("@/components/sections/deleted-tweets")),
  contacts: lazy(() => import("@/components/sections/contacts")),
  "ghost-data": lazy(() => import("@/components/sections/ghost-data")),
  "shadow-profile": lazy(() => import("@/components/sections/shadow-profile")),
};

interface ContentAreaProps {
  sectionId: string;
}

export function ContentArea({ sectionId }: ContentAreaProps) {
  const { state } = useArchive();
  const archive = state.status === "ready" ? state.archive : null;

  const Section = SECTION_MAP[sectionId] as SectionComponent | undefined;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      {Section && archive ? (
        <SectionErrorBoundary sectionId={sectionId}>
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-7 w-48 animate-pulse rounded-lg bg-background-raised" />
                  <div className="h-4 w-72 animate-pulse rounded bg-background-raised" />
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl border border-border bg-background-raised"
                    />
                  ))}
                </div>
              </div>
            }
          >
            <Section archive={archive} />
          </Suspense>
        </SectionErrorBoundary>
      ) : (
        <SectionPlaceholder sectionId={sectionId} />
      )}
    </main>
  );
}
