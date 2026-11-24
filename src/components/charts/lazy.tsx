"use client";

import dynamic from "next/dynamic";

// Recharts is heavy; keep it out of the initial bundle and skip SSR (it measures the DOM).
function ChartSkeleton({ height }: { height: number }) {
  return <div className="animate-pulse rounded-lg bg-muted" style={{ height }} />;
}

export const BloodPressureChart = dynamic(
  () => import("./trend-charts").then((m) => m.BloodPressureChart),
  { ssr: false, loading: () => <ChartSkeleton height={340} /> },
);

export const PeriodChart = dynamic(
  () => import("./trend-charts").then((m) => m.PeriodChart),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> },
);

export const PulseChart = dynamic(
  () => import("./trend-charts").then((m) => m.PulseChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> },
);
