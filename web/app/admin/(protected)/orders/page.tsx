import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBaseUrl } from "@/lib/server/base-url";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/server/repos/orders-repo";
import type { AdminOrderListItem } from "@/server/services/admin/orders";
import { ConfirmPaymentButton } from "./confirm-payment-button";

type SearchParamsValue =
  | Record<string, string | string[] | undefined>
  | undefined;

type OrdersPageProps = {
  searchParams?: SearchParamsValue | Promise<SearchParamsValue>;
};

type FilterValue = OrderStatus | "ALL";

const ORDER_STATUS_VALUES = [
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "REFUNDED",
] as const satisfies readonly OrderStatus[];

const STATUS_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "全部", value: "ALL" },
  { label: "待付款", value: "PENDING_PAYMENT" },
  { label: "已付款", value: "PAID" },
  { label: "已取消", value: "CANCELLED" },
  { label: "已退款", value: "REFUNDED" },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "待付款",
  PAID: "已付款",
  CANCELLED: "已取消",
  REFUNDED: "已退款",
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
  REFUNDED: "border-indigo-200 bg-indigo-50 text-indigo-800",
};

const moneyFormat = new Intl.NumberFormat("zh-Hans-MY", {
  style: "currency",
  currency: "TWD",
  minimumFractionDigits: 0,
});

const dateTimeFormat = new Intl.DateTimeFormat("zh-Hans", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentStatus = resolveFilterValue(resolvedSearchParams);
  const orders = await fetchAdminOrders(currentStatus);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">訂單管理</h1>
          <p className="text-sm text-muted-foreground">
            瀏覽最新更新的訂單，並依狀態快速篩選待處理項目。
          </p>
        </div>
      </header>

      <StatusFilters currentStatus={currentStatus} />
      <OrdersTable orders={orders} />
    </div>
  );
}

const fetchAdminOrders = async (
  status: FilterValue
): Promise<AdminOrderListItem[]> => {
  const search =
    status === "ALL" ? "" : `?status=${encodeURIComponent(status)}`;
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/api/admin/orders${search}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  let body: { data?: AdminOrderListItem[]; error?: string } | null = null;

  try {
    body = await response.json();
  } catch (error) {
    console.error("Failed to parse admin orders response", error);
  }

  if (!response.ok) {
    const message = body?.error ?? "載入訂單失敗";
    throw new Error(message);
  }

  return body?.data ?? [];
};

const StatusFilters = ({ currentStatus }: { currentStatus: FilterValue }) => (
  <div className="flex flex-wrap gap-2">
    {STATUS_OPTIONS.map((option) => {
      const isActive = option.value === currentStatus;
      const href =
        option.value === "ALL"
          ? "/admin/orders"
          : `/admin/orders?status=${option.value}`;

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
);
const OrdersTable = ({ orders }: { orders: AdminOrderListItem[] }) => {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          目前沒有符合條件的訂單。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border pb-3 pr-4 font-semibold">
                  訂單
                </th>
                <th className="border-b border-border pb-3 pr-4 font-semibold">
                  學生
                </th>
                <th className="border-b border-border pb-3 pr-4 font-semibold">
                  課程 / 商品
                </th>
                <th className="border-b border-border pb-3 pr-4 font-semibold">
                  金額
                </th>
                <th className="border-b border-border pb-3 pr-4 font-semibold">
                  狀態
                </th>
                <th className="border-b border-border pb-3 font-semibold">
                  最後更新
                </th>
                <th className="border-b border-border pb-3 pl-4 text-right font-semibold">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(({ order, student, user, summary }) => (
                <tr key={order.id} className="align-top">
                  <td className="py-4 pr-4 w-50">
                    <p className="font-medium">{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      建立於 {formatDateTime(order.created_at)}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-medium">{student?.name ?? "未知學生"}</p>
                    <p className="text-xs text-muted-foreground">
                      LINE: {user?.display_name ?? "未知用戶"}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-medium">{summary.title}</p>
                    {summary.detail && (
                      <p className="text-xs text-muted-foreground">
                        {summary.detail}
                      </p>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-semibold">
                      {formatMoney(order.final_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      原價 {formatMoney(order.total_amount)}
                    </p>
                  </td>
                  <td className="py-4 pr-4 w-20">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        STATUS_CLASSES[order.status]
                      )}
                    >
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <p className="font-medium">
                      {formatDateTime(order.updated_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.paid_at
                        ? `付款於 ${formatDateTime(order.paid_at)}`
                        : "尚未付款"}
                    </p>
                  </td>
                  <td className="py-4 pl-4 text-right align-middle">
                    {order.status === "PENDING_PAYMENT" ? (
                      <ConfirmPaymentButton orderId={order.id} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        已處理
                      </span>
                    )}
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
  const normalized = normalizeStatus(first);
  return normalized ?? "ALL";
};

const normalizeStatus = (value?: string): OrderStatus | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.replace(/-/g, "_").toUpperCase();
  return ORDER_STATUS_VALUES.find((status) => status === normalized);
};

const formatMoney = (value: number): string => moneyFormat.format(value);

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateTimeFormat.format(date);
};
