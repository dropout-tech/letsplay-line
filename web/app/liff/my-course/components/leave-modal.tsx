"use client";

import React from "react";

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionDate: string;
  sessionTime: string;
  className: string;
}

export function LeaveModal({
  isOpen,
  onClose,
  onConfirm,
  sessionDate,
  sessionTime,
  className,
}: LeaveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">確認請假?</h3>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 space-y-2">
          <div className="flex justify-between">
            <span>課程:</span>
            <span className="font-medium text-gray-900">{className}</span>
          </div>
          <div className="flex justify-between">
            <span>日期:</span>
            <span className="font-medium text-gray-900">{sessionDate}</span>
          </div>
          <div className="flex justify-between">
            <span>時間:</span>
            <span className="font-medium text-gray-900">{sessionTime}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          請假後系統將會自動釋出名額。若需補課，請需另外安排。
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            再想想
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-sm transition-colors"
          >
            確認請假
          </button>
        </div>
      </div>
    </div>
  );
}
