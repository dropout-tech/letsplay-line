"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminEnrollmentListItem } from "@/server/services/admin/enrollments";

type EditEnrollmentDialogProps = {
  item: AdminEnrollmentListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const EditEnrollmentDialog = ({
  item,
  open,
  onOpenChange,
}: EditEnrollmentDialogProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    total_credits: item.enrollment.total_credits,
    remaining_credits: item.enrollment.remaining_credits,
    expiry_date: item.enrollment.expiry_date
      ? format(new Date(item.enrollment.expiry_date), "yyyy-MM-dd")
      : "",
  });

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/enrollments`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.enrollment.id,
            total_credits: Number(formData.total_credits),
            remaining_credits: Number(formData.remaining_credits),
            expiry_date: formData.expiry_date || null,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "更新失敗");
        }

        onOpenChange(false);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "更新時發生錯誤");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>編輯學員堂數</DialogTitle>
          <DialogDescription>
            修改學員在「{item.class?.title}」的點數與到期日。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="total" className="text-right text-sm font-medium">
              總點數
            </label>
            <input
              id="total"
              type="number"
              className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.total_credits}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total_credits: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="remaining"
              className="text-right text-sm font-medium"
            >
              剩餘點數
            </label>
            <input
              id="remaining"
              type="number"
              className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.remaining_credits}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  remaining_credits: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="expiry" className="text-right text-sm font-medium">
              到期日
            </label>
            <input
              id="expiry"
              type="date"
              className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.expiry_date}
              onChange={(e) =>
                setFormData({ ...formData, expiry_date: e.target.value })
              }
            />
          </div>
        </div>

        {error && (
          <div className="text-sm font-medium text-destructive">{error}</div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "儲存中..." : "儲存修改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
