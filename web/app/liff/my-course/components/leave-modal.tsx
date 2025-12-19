"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface LeaveSession {
  id: string;
  date: string;
  time: string;
  courseName: string;
}

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  session: LeaveSession | null;
}

export function LeaveModal({
  isOpen,
  onClose,
  onConfirm,
  session,
}: LeaveModalProps) {
  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>確認請假</DialogTitle>
          <DialogDescription>您確定要為此課程請假嗎？</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-bold text-right">課程:</span>
            <span className="col-span-3">{session.courseName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-bold text-right">日期:</span>
            <span className="col-span-3">{session.date}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-bold text-right">時間:</span>
            <span className="col-span-3">{session.time}</span>
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            確認請假
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
