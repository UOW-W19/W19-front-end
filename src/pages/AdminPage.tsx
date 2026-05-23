import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Database,
  FileText,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
import { cn } from "@/lib/utils";
import { adminApi, type AdminFeatureStatus, type AdminMetric } from "@/services/api/admin";

const metricIcons: Record<string, LucideIcon> = {
  users: Users,
  posts: FileText,
  meetups: CalendarDays,
  conversations: MessageCircle,
  messages: MessageCircle,
  saved_words: BookOpen,
  scan_sessions: ScanLine,
  notifications: Bell,
  reports: AlertTriangle,
};

const featureIcons: Record<string, LucideIcon> = {
  "user-management": Users,
  "role-management": ShieldCheck,
  "content-moderation": FileText,
  "meetup-moderation": CalendarDays,
  "scanner-analytics": ScanLine,
  "notification-operations": Bell,
  "audit-logs": Activity,
  "app-configuration": Database,
};

function formatValue(value: number) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function formatGeneratedAt(value?: string) {
  if (!value) return "Not loaded yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({ metric }: { metric: AdminMetric }) {
  const Icon = metricIcons[metric.key] ?? Activity;

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatValue(metric.value)}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {metric.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {metric.description}
        </p>
      )}
    </article>
  );
}

function FutureFeatureRow({ feature }: { feature: AdminFeatureStatus }) {
  const Icon = featureIcons[feature.key] ?? Lock;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card p-4",
        !feature.enabled && "opacity-75"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{feature.label}</p>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground">
            {feature.status.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ["admin-summary"],
    queryFn: adminApi.getSummary,
    staleTime: 60_000,
  });

  const metrics = summaryQuery.data?.metrics ?? [];
  const futureFeatures = summaryQuery.data?.futureFeatures ?? [];
  const generatedAt = useMemo(
    () => formatGeneratedAt(summaryQuery.data?.generatedAt),
    [summaryQuery.data?.generatedAt]
  );

  return (
    <div className="h-full overflow-y-auto bg-muted/20 pb-24 scrollbar-hide">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <section className="mb-6 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin workspace
            </div>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              Application Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Operational snapshot for Locale accounts, content, learning, scanner, and notification activity.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{user?.displayName ?? "Admin"}</p>
              <p>Updated {generatedAt}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => summaryQuery.refetch()}
              disabled={summaryQuery.isFetching}
            >
              {summaryQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </section>

        {summaryQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : summaryQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Unable to load admin dashboard data.
          </div>
        ) : (
          <>
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">System Overview</h2>
                  <p className="text-sm text-muted-foreground">Current totals from backend services.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => (
                  <MetricCard key={metric.key} metric={metric} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-foreground">Future Admin Features</h2>
                <p className="text-sm text-muted-foreground">
                  Planned controls are visible for roadmap clarity and remain disabled in this MVP.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {futureFeatures.map((feature) => (
                  <FutureFeatureRow key={feature.key} feature={feature} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
