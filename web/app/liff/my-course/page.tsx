"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  User,
  MessageCircle,
  Clock,
  ChartColumn,
  MapPin,
} from "lucide-react";
import {
  mockStudents,
  mockEnrollments,
  mockSessions,
  mockAttendance,
  AttendanceStatus,
  Session,
} from "./mock-data";
import { LeaveModal } from "./components/leave-modal";
import { cn } from "@/lib/utils";

// Adapter types for UI
interface UIStats {
  courseName: string;
  attended: number;
  remaining: number;
  total: number;
  expiryDate: string;
}

interface UIAttendance {
  id: string; // session id or attendance id
  date: string;
  time: string;
  courseName: string;
  status: AttendanceStatus | "SCHEDULED" | "COMPLETED"; // Expanded status
}

export default function MyCoursePage() {
  const [currentStudentId, setCurrentStudentId] = useState(mockStudents[0].id);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<UIAttendance | null>(
    null
  );

  // Derived Data
  const student =
    mockStudents.find((s) => s.id === currentStudentId) || mockStudents[0];

  // 1. Derive Stats from Enrollments
  const stats: UIStats[] = mockEnrollments
    .filter((e) => e.studentId === currentStudentId)
    .map((e) => ({
      courseName: e.className,
      attended: e.attendedCredits,
      remaining: e.remainingCredits,
      total: e.totalCredits,
      expiryDate: e.expiryDate,
    }));

  // 2. Derive Calendar Sessions
  // Get all class IDs for this student
  const studentClassIds = mockEnrollments
    .filter((e) => e.studentId === currentStudentId)
    .map((e) => e.classId);

  // Find all sessions for these classes
  const relevantSessions = mockSessions.filter((s) =>
    studentClassIds.includes(s.classId)
  );

  // Merge with Attendance records
  const attendanceList: UIAttendance[] = relevantSessions.map((session) => {
    const attendanceRecord = mockAttendance.find(
      (a) => a.sessionId === session.id && a.studentId === currentStudentId
    );

    // Determine status:
    // If attendance record exists, use that status (PRESENT, ABSENT, LEAVE)
    // If not, check session status (SCHEDULED, COMPLETED)
    // Or check if it's in the past/future
    let status: any = attendanceRecord
      ? attendanceRecord.status
      : session.status;

    // Override 'COMPLETED' with 'ABSENT' or 'UNRECORDED' if no attendance record exists?
    // Spec says: "Course Calendar... Present(Green), Absent(Red), Scheduled(Blue), Leave(Orange)"
    if (!attendanceRecord && session.status === "COMPLETED") {
      // If it's completed but no record, maybe it implies Absent or just hasn't been input yet?
      // For now, let's leave it as COMPLETED or map to SCHEDULED logic for simplicity if date is future
      const sessionDate = new Date(session.date);
      const today = new Date();
      if (sessionDate < today) {
        status = "ABSENT"; // Assume absent if completed and no record
      } else {
        status = "SCHEDULED";
      }
    }

    return {
      id: session.id,
      date: session.date,
      time: `${session.startTime}-${session.endTime}`,
      courseName:
        mockEnrollments.find((e) => e.classId === session.classId)?.className ||
        "Unknown Class",
      status: status,
    };
  });

  // Handlers
  const handleLeaveClick = (session: UIAttendance) => {
    setSelectedSession(session);
    setIsLeaveModalOpen(true);
  };

  const confirmLeave = () => {
    if (selectedSession) {
      alert(`Leave application submitted for ${selectedSession.date}`);
      setIsLeaveModalOpen(false);
      setSelectedSession(null);
    }
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const daysInMonth = getDaysInMonth(selectedDate);
  const firstDayOfMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  ).getDay();

  // Helper to get session for a specific date
  const getSessionForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return attendanceList.find((a) => a.date === dateStr);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-500";
      case "ABSENT":
        return "bg-red-500";
      case "SCHEDULED":
        return "bg-blue-500";
      case "LEAVE":
        return "bg-orange-500";
      default:
        return "bg-white";
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "border-l-green-500";
      case "ABSENT":
        return "border-l-red-500";
      case "SCHEDULED":
        return "border-l-blue-500";
      case "LEAVE":
        return "border-l-orange-500";
      default:
        return "border-l-gray-300";
    }
  };

  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PRESENT":
        return "outline";
      case "SCHEDULED":
        return "default";
      default:
        return "secondary";
    }
  };

  // Helper functions for localization
  const getMembershipLabel = (tier: string) => {
    switch (tier) {
      case "DIAMOND":
        return "鑽石會員";
      case "GOLD":
        return "黃金會員";
      case "SILVER":
        return "白銀會員";
      default:
        return "非會員";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "已出席";
      case "ABSENT":
        return "缺席";
      case "LEAVE":
        return "請假";
      case "SCHEDULED":
        return "未開始";
      case "COMPLETED":
        return "已結束";
      default:
        return status;
    }
  };

  const getLevelLabel = (level: string) => {
    // ... existing code ...
    switch (level) {
      case "Beginner":
        return "初學";
      case "Intermediate":
        return "中階";
      case "Advanced":
        return "進階";
      default:
        return level;
    }
  };

  const getMembershipColor = (tier: string) => {
    switch (tier) {
      case "DIAMOND":
        return "bg-cyan-500 hover:bg-cyan-600";
      case "GOLD":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "SILVER":
        return "bg-slate-400 hover:bg-slate-500";
      default:
        return "bg-slate-200 text-slate-700 hover:bg-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex flex-col gap-3">
        <h1 className="text-xl font-bold">我的課程</h1>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mockStudents.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentStudentId(s.id)}
              className={cn(
                "px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all",
                currentStudentId === s.id
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-muted-foreground/30 bg-white text-muted-foreground hover:bg-gray-50"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Member Info Card */}
        <Card className="border-none shadow-md bg-white text-slate-800 overflow-hidden relative">
          <CardContent className="p-6 relative">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {student.name}

                    <Badge
                      variant="secondary"
                      className="mx-4 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none"
                    >
                      {getLevelLabel(student.level)}
                    </Badge>
                    <Badge
                      className={cn(
                        "px-3 py-1 text-sm border-none shadow-none text-white",
                        getMembershipColor(student.membership_tier)
                      )}
                    >
                      {getMembershipLabel(student.membership_tier)}
                    </Badge>
                  </h2>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ChartColumn className="w-5 h-5" /> 堂數統計
          </h3>
          {stats.map((stat, idx) => (
            <Card key={idx} className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{stat.courseName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-center items-center">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-green-600">
                      {stat.attended}
                    </p>
                    <p className="text-xs text-muted-foreground">已上</p>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-blue-600">
                      {stat.remaining}
                    </p>
                    <p className="text-xs text-muted-foreground">剩餘</p>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-gray-500">
                      {stat.total}
                    </p>
                    <p className="text-xs text-muted-foreground">總堂數</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground font-normal mt-3 text-right">
                  使用期限: {stat.expiryDate}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agenda Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5" /> 近期課程
          </h3>
          {/* Filter sessions for This Week Mon to Next Week Sun */}
          {attendanceList
            .filter((s) => {
              const sDate = new Date(s.date);

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dayOfWeek = today.getDay(); // 0(Sun) - 6(Sat)

              // Calculate this week's Monday
              const diffToMon = (dayOfWeek + 6) % 7;
              const thisMon = new Date(today);
              thisMon.setDate(today.getDate() - diffToMon);

              // Calculate next week's Sunday (This Mon + 13 days)
              const nextSun = new Date(thisMon);
              nextSun.setDate(thisMon.getDate() + 13);
              nextSun.setHours(23, 59, 59, 999);

              return sDate >= thisMon && sDate <= nextSun;
            })
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((session) => (
              <Card
                key={session.id}
                className={cn(
                  "border-l-4 shadow-sm",
                  getStatusBorderColor(session.status)
                )}
              >
                <CardContent className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base">
                        {session.courseName.split("-")[0]}
                      </p>
                      <Badge
                        variant={getStatusBadgeVariant(session.status)}
                        className={cn(
                          "text-xs",
                          session.status === "PRESENT" &&
                            "bg-green-50 text-green-700 border-green-300",
                          session.status === "ABSENT" &&
                            "bg-red-50 text-red-700 border-red-300",
                          session.status === "SCHEDULED" &&
                            "bg-blue-50 text-blue-700 border-blue-300",
                          session.status === "LEAVE" &&
                            "bg-orange-50 text-orange-700 border-orange-300"
                        )}
                      >
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{session.date}</span>
                      <span>{session.time}</span>
                    </div>
                  </div>
                  {/* Leave Button for SCHEDULED sessions */}
                  {session.status === "SCHEDULED" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleLeaveClick(session)}
                    >
                      請假
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Calendar Section */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> 課程日曆
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setSelectedDate(
                    new Date(selectedDate.setMonth(selectedDate.getMonth() - 1))
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium flex items-center">
                {selectedDate.getFullYear()} / {selectedDate.getMonth() + 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setSelectedDate(
                    new Date(selectedDate.setMonth(selectedDate.getMonth() + 1))
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex gap-3 text-xs mb-4 flex-wrap justify-center">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> 已上
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 未上
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>{" "}
                請假
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> 缺席
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                <div
                  key={d}
                  className="text-xs text-muted-foreground font-medium"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({
                length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1,
              }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {daysInMonth.map((date) => {
                const session = getSessionForDate(date);
                const isToday =
                  new Date().toDateString() === date.toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-colors",
                      isToday ? "bg-accent/50 font-bold" : "hover:bg-gray-50"
                    )}
                  >
                    <span>{date.getDate()}</span>
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1",
                        getStatusColor(session?.status)
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            className="w-full gap-2 text-primary border-primary hover:bg-primary/5"
          >
            <MessageCircle size={16} /> 聯繫客服
          </Button>
        </div>
      </div>

      {isLeaveModalOpen && selectedSession && (
        <LeaveModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          onConfirm={confirmLeave}
          session={{
            id: selectedSession.id,
            date: selectedSession.date,
            time: selectedSession.time,
            courseName: selectedSession.courseName,
            status: selectedSession.status as any, // Cast to AttendanceStatus for compatibility or refactor LeaveModal
            credits: 0, // Mock val
          }}
        />
      )}
    </div>
  );
}
