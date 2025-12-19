"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type ConfirmPaymentButtonProps = {
  orderId: string;
};

type PaymentPreviewResult = {
  items: {
    key: string;
    productName: string;
    variantName: string;
    quantity: number;
    enrollments: {
      className: string;
      creditsToAdd: number;
      sessions: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        isNew: boolean;
      }[];
    }[];
  }[];
};

export const ConfirmPaymentButton = ({
  orderId,
}: ConfirmPaymentButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PaymentPreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [excludedSessionIds, setExcludedSessionIds] = useState<Set<string>>(
    new Set()
  );
  const [creditsOverrides, setCreditsOverrides] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (open) {
      loadPreview({});
    } else {
      setPreview(null);
      setError(null);
      setExcludedSessionIds(new Set());
      setCreditsOverrides({});
    }
  }, [open, orderId]);

  const loadPreview = async (overrides: Record<string, number>) => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/preview-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditsOverrides: overrides }),
      });
      if (!res.ok) {
        let message = "無法載入預覽";
        try {
          const body = await res.json();
          if (body.error) message = body.error;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "載入預覽失敗");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Debounced credits adjustment
  useEffect(() => {
    if (!open || Object.keys(creditsOverrides).length === 0) return;

    const timer = setTimeout(() => {
      loadPreview(creditsOverrides);
    }, 500);

    return () => clearTimeout(timer);
  }, [creditsOverrides, open]);

  const handleChange = (next: boolean) => {
    if (isPending) {
      return;
    }
    setOpen(next);
  };

  const handleCreditsChange = (key: string, val: string) => {
    const num = parseInt(val, 10);
    if (num < 0) return;
    setCreditsOverrides((prev) => ({ ...prev, [key]: num }));
  };

  const handleToggleExcludeSession = (sessionId: string) => {
    setExcludedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/orders/${orderId}/confirm-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              excludedSessionIds: Array.from(excludedSessionIds),
              creditsOverrides,
            }),
          }
        );

        if (!response.ok) {
          let message = "更新付款狀態失敗";
          try {
            const body = await response.json();
            if (body?.error) {
              message = body.error;
            }
          } catch (parseError) {
            console.error("Failed to parse confirm payment error", parseError);
          }
          throw new Error(message);
        }

        setOpen(false);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "更新付款狀態時發生錯誤，請稍後再試。"
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleChange}>
      <DialogTrigger asChild>
        <Button size="sm">確認付款</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col min-h-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>確認付款與排課預覽</DialogTitle>
          <DialogDescription>
            確認付款後系統將自動產生以下排課紀錄。若移除某一堂課的出席，該堂課的點數將會保留在學生帳戶中。此操作無法自動復原。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-2 flex flex-col gap-4">
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              課程堂數確認與調整
            </h4>
            {preview?.items.map((item) => (
              <div key={item.key} className="space-y-2">
                {item.enrollments.map((enrollment, eIdx) => {
                  const overrideKey = `${item.key}-${eIdx}`;
                  return (
                    <div
                      key={overrideKey}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-muted-foreground truncate flex-1">
                        {enrollment.className}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                          堂數:
                        </label>
                        <input
                          aria-label="堂數"
                          type="number"
                          min="0"
                          className="w-20 px-2 py-1 border rounded bg-white dark:bg-black"
                          value={
                            creditsOverrides[overrideKey] ??
                            enrollment.creditsToAdd
                          }
                          onChange={(e) =>
                            handleCreditsChange(overrideKey, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {!preview && isLoadingPreview && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {isLoadingPreview && !preview ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            ) : preview ? (
              <ScrollArea className="h-[350px] rounded-md border p-0">
                <div className="space-y-6 p-4">
                  {preview.items.map((item) => (
                    <div
                      key={item.key}
                      className="border rounded-lg p-4 space-y-3 relative overflow-hidden"
                    >
                      {isLoadingPreview && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                          <span className="text-xs font-medium animate-pulse">
                            重新計算中...
                          </span>
                        </div>
                      )}
                      <div className="font-medium flex justify-between items-center">
                        <span>
                          {item.productName} - {item.variantName}
                        </span>
                        <Badge variant="outline">x{item.quantity}</Badge>
                      </div>

                      <div className="space-y-3 pl-2 border-l-2 ml-1">
                        {item.enrollments.map((enrollment, eIdx) => (
                          <div key={eIdx} className="space-y-2">
                            <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                              <span>{enrollment.className}</span>
                              <Badge variant="secondary">
                                +{enrollment.creditsToAdd} 堂
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              {enrollment.sessions.length === 0 && (
                                <div className="col-span-full h-10 border border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                                  無自動排課項目
                                </div>
                              )}
                              {enrollment.sessions.map((session) => {
                                const startDate = new Date(session.startTime);
                                const endDate = new Date(session.endTime);
                                const isExcluded = excludedSessionIds.has(
                                  session.id
                                );

                                return (
                                  <div
                                    key={session.id}
                                    className={`p-2 rounded border flex items-center justify-between group transition-colors ${
                                      isExcluded
                                        ? "bg-slate-100 border-slate-200 opacity-60 dark:bg-slate-900 dark:border-slate-800"
                                        : session.isNew
                                        ? "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-800"
                                        : "bg-gray-50 dark:bg-gray-900"
                                    }`}
                                  >
                                    <div
                                      className={`flex flex-col ${
                                        isExcluded
                                          ? "line-through decoration-slate-400"
                                          : ""
                                      }`}
                                    >
                                      <span className="font-medium">
                                        {format(startDate, "yyyy/MM/dd")}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {format(startDate, "HH:mm")} -{" "}
                                        {format(endDate, "HH:mm")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {session.isNew ? (
                                        <Badge
                                          className="bg-green-50 text-green-700 border-green-300 text-[10px] h-5"
                                          variant="default"
                                        >
                                          新增
                                        </Badge>
                                      ) : (
                                        <Badge
                                          className="text-[10px] h-5"
                                          variant="secondary"
                                        >
                                          既有
                                        </Badge>
                                      )}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className={`h-6 w-6 text-muted-foreground hover:text-destructive ${
                                          isExcluded ? "text-destructive" : ""
                                        }`}
                                        onClick={() =>
                                          handleToggleExcludeSession(session.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                無法顯示預覽資料，或訂單內容無需排課。
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || isLoadingPreview || !!error}
          >
            {isPending ? "處理中..." : "確認並排課"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
