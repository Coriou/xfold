"use client";

import { useArchive } from "@/lib/archive/archive-store";
import { LandingPage } from "./landing/landing-page";
import { DashboardShell } from "./dashboard/dashboard-shell";

export function AppShell() {
  const { state } = useArchive();

  if (state.status === "ready") {
    return <DashboardShell />;
  }

  return <LandingPage />;
}
