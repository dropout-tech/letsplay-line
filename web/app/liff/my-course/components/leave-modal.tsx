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
import { Attendance } from "../mock-data";

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  session: Attendance | null;
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
          <DialogTitle>Confirm Leave Application</DialogTitle>
          <DialogDescription>
            Are you sure you want to apply for leave for this session?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-bold text-right">Class:</span>
            <span className="col-span-3">{session.courseName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-bold text-right">Date:</span>
            <span className="col-span-3">{session.date}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-bold text-right">Time:</span>
            <span className="col-span-3">{session.time}</span>
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Confirm Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
