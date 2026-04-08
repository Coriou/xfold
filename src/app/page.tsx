import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  // Suspense boundary required so the dashboard's useSearchParams() call
  // (used for the ?section= deep link) doesn't bail out of prerendering
  // the rest of the page tree.
  return (
    <Suspense fallback={null}>
      <AppShell />
    </Suspense>
  );
}
