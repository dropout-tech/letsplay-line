"use client";

import React, { useState, useMemo } from "react";
import {
  mockLineUser,
  mockStudents,
  mockEnrollments,
  mockSessions,
  mockAttendance,
  Student,
  Session,
  Attendance,
} from "./mock-data";

import { useLiff } from "../providers/liff-provider";
import { LeaveModal } from "./components/leave-modal";

export default function MyCoursePage() {
  const { profile, liffError, login, liff } = useLiff();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    mockStudents[0].id
  );

  // State for Leave Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedLeaveSession, setSelectedLeaveSession] = useState<{
    id: string;
    classId: string;
    date: string;
    startTime: string;
    endTime: string;
    className: string;
    displayStatus: string;
  } | null>(null);

  // Local state for Attendance to simulate updates (until backend)
  const [localAttendance, setLocalAttendance] =
    useState<Attendance[]>(mockAttendance);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 1. Filter Data for Selected Student
  const selectedStudent = useMemo(
    () =>
      mockStudents.find((s) => s.id === selectedStudentId) || mockStudents[0],
    [selectedStudentId]
  );

  // Find all enrollments for this student
  const studentEnrollments = useMemo(
    () => mockEnrollments.filter((e) => e.studentId === selectedStudentId),
    [selectedStudentId]
  );

  // 2. Combine Session + Attendance
  const filledSessions = useMemo(() => {
    if (studentEnrollments.length === 0) return [];

    const enrolledClassIds = studentEnrollments.map((e) => e.classId);

    // Get sessions for all enrolled classes
    const relevantSessions = mockSessions.filter((s) =>
      enrolledClassIds.includes(s.classId)
    );

    return relevantSessions.map((session) => {
      // Use LOCAL attendance state
      const attendance = localAttendance.find(
        (a) => a.sessionId === session.id && a.studentId === selectedStudentId
      );

      // Find class name from enrollments
      const enrollment = studentEnrollments.find(
        (e) => e.classId === session.classId
      );
      const className = enrollment?.className || "Unknown Class";

      let displayStatus:
        | "PRESENT"
        | "ABSENT"
        | "LEAVE"
        | "SCHEDULED"
        | "CANCELLED"
        | "UNRECORDED" = "SCHEDULED";

      if (attendance) {
        displayStatus = attendance.status;
      } else if (session.status === "CANCELLED") {
        displayStatus = "CANCELLED";
      } else {
        displayStatus = "SCHEDULED";
      }

      return {
        ...session,
        attendance,
        displayStatus,
        className,
      };
    });
  }, [selectedStudentId, studentEnrollments, localAttendance]); // Dep on localAttendance

  // 3. Agenda Data
  const agendaSessions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endRange = new Date(startOfToday);
    endRange.setDate(startOfToday.getDate() + 14);

    return filledSessions
      .filter((s) => {
        const sDate = new Date(s.date);
        return sDate >= startOfToday && sDate <= endRange;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filledSessions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      // ... (same as before)
      case "PRESENT":
        return "bg-green-100 text-green-800 border-green-200";
      case "ABSENT":
        return "bg-red-100 text-red-800 border-red-200";
      case "LEAVE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  // Handle Session Click
  const handleSessionClick = (session: any) => {
    // Only allow leave if SCHEDULED (Blue)
    if (
      session.displayStatus === "SCHEDULED" ||
      session.displayStatus === "UNRECORDED"
    ) {
      setSelectedLeaveSession(session);
      setIsLeaveModalOpen(true);
    }
  };

  // Handle Confirm Leave
  const handleConfirmLeave = () => {
    if (!selectedLeaveSession) return;

    // Update Local State: Add a new Attendance record with status 'LEAVE'
    const newAttendance: Attendance = {
      id: `new_leave_${Date.now()}`,
      sessionId: selectedLeaveSession.id,
      studentId: selectedStudentId,
      status: "LEAVE",
      creditsUsed: 1, // Deduct credit? Rule says yes usually
      isMakeup: false,
    };

    setLocalAttendance((prev) => [...prev, newAttendance]);

    // Clear modal
    setSelectedLeaveSession(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">我的課程</h1>
        <div className="text-sm text-gray-500">
          Hi, {profile?.displayName || mockLineUser.displayName}
          {/* ... */}
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Student Switcher */}
        {mockStudents.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* ... (unchanged) */}
            {mockStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStudentId === student.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {student.name}
              </button>
            ))}
          </div>
        )}

        {/* Member Info ... (unchanged) */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {/* ... */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedStudent.name}
              </h2>
            </div>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
              {selectedStudent.level}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400">學員生日</span>
              <span className="font-medium text-gray-700">
                {selectedStudent.birthday}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400">連絡電話</span>
              <span className="font-medium text-gray-700">
                {selectedStudent.phone}
              </span>
            </div>
          </div>
        </section>

        {/* Enrolled Courses List */}
        <section className="space-y-3">
          <h3 className="font-bold text-gray-800 px-1">
            目前課程 ({studentEnrollments.length})
          </h3>
          {studentEnrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              {/* ... (unchanged) */}
              <div className="mb-2">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {enrollment.className}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  到期日: {enrollment.expiryDate}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-3">
                <div className="text-center">
                  <div className="text-xs text-gray-400">已上</div>
                  <div className="font-bold text-green-600">
                    {enrollment.attendedCredits}
                  </div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-xs text-gray-400">剩餘</div>
                  <div className="font-bold text-blue-600">
                    {enrollment.remainingCredits}
                  </div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-xs text-gray-400">總堂數</div>
                  <div className="font-bold text-gray-600">
                    {enrollment.totalCredits}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Agenda View */}
        <section className="space-y-3">
          <h3 className="font-bold text-gray-800 px-1">近期課程 (兩週內)</h3>
          {agendaSessions.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-xl text-gray-400 text-sm">
              近期無課程
            </div>
          ) : (
            <div className="space-y-3">
              {agendaSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)} // Add click handler
                  className={`rounded-xl p-4 border flex items-center justify-between shadow-sm cursor-pointer transition-transform active:scale-[0.98] ${getStatusColor(
                    session.displayStatus
                  )}`}
                >
                  <div>
                    <h4 className="font-bold text-sm mb-1">
                      {session.className}
                    </h4>
                    <div className="text-xs opacity-80 flex items-center gap-2">
                      <span>{session.date}</span>
                      <span>|</span>
                      <span>
                        {session.startTime} - {session.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-bold px-2 py-1 bg-white/50 rounded-lg backdrop-blur-sm">
                    {session.displayStatus === "SCHEDULED"
                      ? "未上"
                      : session.displayStatus === "PRESENT"
                      ? "已上"
                      : session.displayStatus === "ABSENT"
                      ? "缺席"
                      : session.displayStatus === "LEAVE"
                      ? "請假"
                      : session.displayStatus}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Course Calendar */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {/* ... (Header unchanged) */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">課程日曆</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleMonthChange(-1)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                ←
              </button>
              <span className="text-gray-700 font-medium">
                {currentMonth.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                onClick={() => handleMonthChange(1)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-xs text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Padding */}
            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square"></div>
            ))}

            {daysInMonth.map((date) => {
              const dateStr = date.toISOString().split("T")[0];
              const events = filledSessions.filter((e) => e.date === dateStr);
              const primaryEvent = events[0];
              const hasMultiple = events.length > 1;

              return (
                <div
                  key={dateStr}
                  onClick={() =>
                    primaryEvent && handleSessionClick(primaryEvent)
                  }
                  className="aspect-square flex flex-col items-center justify-center relative hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <span
                    className={`text-sm ${
                      date.toDateString() === new Date().toDateString()
                        ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                        : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {primaryEvent && (
                    <div className="mt-1 flex gap-0.5">
                      {/* Status Dots */}
                      {primaryEvent.displayStatus === "PRESENT" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      )}
                      {primaryEvent.displayStatus === "ABSENT" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      )}
                      {primaryEvent.displayStatus === "LEAVE" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      )}
                      {primaryEvent.displayStatus === "SCHEDULED" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      )}

                      {/* Multiple indicator */}
                      {hasMultiple && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center mt-4 text-xs text-gray-500 flex-wrap">
            {/* ... */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>已上
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>未上
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>請假
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>缺席
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="text-center">
          <a
            href="https://line.me/R/ti/p/@example"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
          >
            聯繫客服
          </a>
        </div>
      </main>

      {/* Leave Modal */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeave}
        sessionDate={selectedLeaveSession?.date || "-"}
        sessionTime={`${selectedLeaveSession?.startTime} - ${selectedLeaveSession?.endTime}`}
        className={selectedLeaveSession?.className || "-"}
      />
    </div>
  );
}
