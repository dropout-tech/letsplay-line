import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EnrollmentStatus } from "@/server/repos/enrollments-repo";
import type { AdminEnrollmentListItem } from "@/server/services/admin/enrollments";
import { EditEnrollmentButton } from "./edit-enrollment-button";

type SearchParamsValue =
  | Record<string, string | string[] | undefined>
  | undefined;

type EnrollmentsPageProps = {
  searchParams?: SearchParamsValue | Promise<SearchParamsValue>;
};

type FilterValue = EnrollmentStatus | "ALL";

const STATUS_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "全部", value: "ALL" },
  { label: "有效", value: "ACTIVE" },
  { label: "已到期", value: "EXPIRED" },
  { label: "已取消", value: "CANCELLED" },
];

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "有效",
  EXPIRED: "已到期",
  CANCELLED: "已取消",
};

const STATUS_CLASSES: Record<EnrollmentStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  EXPIRED: "border-amber-200 bg-amber-50 text-amber-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};

const dateTimeFormat = new Intl.DateTimeFormat("zh-Hans", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormat = new Intl.DateTimeFormat("zh-Hans", {
  dateStyle: "medium",
});

export default async function EnrollmentsPage({
  searchParams,
}: EnrollmentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentStatus = resolveFilterValue(resolvedSearchParams);
  const data = await fetchAdminEnrollments(currentStatus);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">學員堂數管理</h1>
          <p className="text-sm text-muted-foreground">
            查看與調整學員在各課程的點數與有效期。
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = option.value === currentStatus;
          const href =
            option.value === "ALL"
              ? "/admin/enrollments"
              : `/admin/enrollments?status=${option.value}`;

          return (
            <Link key={option.value} href={href} prefetch={false}>
              <Button
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "transition-all",
                  isActive ? "shadow-sm" : "text-muted-foreground"
                )}
              >
                {option.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <EnrollmentsTable data={data} />
    </div>
  );
}

const fetchAdminEnrollments = async (
  status: FilterValue
): Promise<AdminEnrollmentListItem[]> => {
  const search =
    status === "ALL" ? "" : `?status=${encodeURIComponent(status)}`;
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/api/admin/enrollments${search}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("載入資料失敗");
  }

  const body = await response.json();
  return body.data ?? [];
};

const getBaseUrl = (): string => {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (envUrl) {
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }

  return "http://localhost:3000";
};

const EnrollmentsTable = ({ data }: { data: AdminEnrollmentListItem[] }) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          目前沒有符合條件的紀錄。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                <th className="px-6 py-4 font-semibold">學員</th>
                <th className="px-6 py-4 font-semibold">課程</th>
                <th className="px-6 py-4 font-semibold text-center">
                  剩餘 / 總額
                </th>
                <th className="px-6 py-4 font-semibold">狀態</th>
                <th className="px-6 py-4 font-semibold">有效期</th>
                <th className="px-6 py-4 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => (
                <tr
                  key={item.enrollment.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">
                      {item.student?.name ?? "未知學員"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate w-40">
                      {item.enrollment.student_id}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">
                      {item.class?.title ?? "未知課程"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate w-40">
                      {item.enrollment.class_id}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-lg text-primary">
                        {item.enrollment.remaining_credits}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        / {item.enrollment.total_credits} 堂
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        STATUS_CLASSES[item.enrollment.status]
                      )}
                    >
                      {STATUS_LABELS[item.enrollment.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">
                      {item.enrollment.expiry_date
                        ? formatDate(item.enrollment.expiry_date)
                        : "無期限"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      建立於 {formatDateTime(item.enrollment.created_at)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <EditEnrollmentButton item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const resolveFilterValue = (params?: SearchParamsValue): FilterValue => {
  const raw = params?.status;
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (first === "ACTIVE" || first === "EXPIRED" || first === "CANCELLED") {
    return first;
  }
  return "ALL";
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormat.format(date);
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormat.format(date);
};
