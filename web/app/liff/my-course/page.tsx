"use client";

import { useEffect, useMemo, useState } from "react";
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
import { LeaveModal } from "./components/leave-modal";
import { cn } from "@/lib/utils";
import { useLiff } from "../providers/liff-provider";
import type { StudentRecord } from "@/server/repos/students-repo";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "UNRECORDED";

type EnrollmentSummary = {
  id: string;
  student_id: string;
  class_id: string;
  class_name: string;
  total_credits: number;
  remaining_credits: number;
  attended_credits: number;
  expiry_date: string | null;
  status: string;
};

type AttendanceItem = {
  id: string;
  student_id: string;
  session_id: string;
  status: AttendanceStatus;
  credits_used: number;
  session: {
    id: string;
    class_id: string;
    class_name: string;
    start_time: string;
    end_time: string;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    branch_id: string | null;
  };
};

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
  const { profile, isLoading: liffLoading } = useLiff();
  const devUserId = process.env.NEXT_PUBLIC_DEV_LIFF_USER_ID;
  const resolvedLineUserId = profile?.userId ?? devUserId ?? null;

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);
  const [attendanceItems, setAttendanceItems] = useState<AttendanceItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<UIAttendance | null>(
    null
  );

  const attendanceRange = useMemo(() => {
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - 6);
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);

    const futureAnchor = new Date(now);
    futureAnchor.setMonth(futureAnchor.getMonth() + 6);
    const toDate = new Date(
      futureAnchor.getFullYear(),
      futureAnchor.getMonth() + 1,
      0
    );
    toDate.setHours(23, 59, 59, 999);

    return {
      from: formatDateParam(fromDate),
      to: formatDateParam(toDate),
    };
  }, []);

  // Load students for the authenticated LIFF user
  useEffect(() => {
    if (!resolvedLineUserId) {
      if (!liffLoading) {
        setStudentsLoading(false);
        setStudentsError("請先登入 LINE 以查看學生資料");
      }
      return;
    }

    const controller = new AbortController();

    const loadStudents = async () => {
      setStudentsLoading(true);
      setStudentsError(null);

      try {
        const response = await fetch("/api/liff/students", {
          headers: {
            "X-Line-User-Id": resolvedLineUserId,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = "載入學生資料失敗";
          try {
            const body = await response.json();
            message = body.error ?? message;
          } catch (parseError) {
            console.error("Failed to parse students response", parseError);
          }
          throw new Error(message);
        }

        const body = await response.json();
        setStudents(body.data ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load students", error);
        setStudents([]);
        setStudentsError(
          error instanceof Error ? error.message : "載入學生資料失敗"
        );
      } finally {
        if (!controller.signal.aborted) {
          setStudentsLoading(false);
        }
      }
    };

    loadStudents();

    return () => controller.abort();
  }, [resolvedLineUserId, liffLoading]);

  // Ensure the selected student stays in sync with loaded data
  useEffect(() => {
    if (!students.length) {
      setCurrentStudentId(null);
      return;
    }

    setCurrentStudentId((prev) => {
      if (prev && students.some((student) => student.id === prev)) {
        return prev;
      }
      return students[0].id;
    });
  }, [students]);

  useEffect(() => {
    if (!currentStudentId) {
      setEnrollments([]);
      setEnrollmentsError(null);
      return;
    }

    if (!resolvedLineUserId) {
      return;
    }

    const controller = new AbortController();

    const loadEnrollments = async () => {
      setEnrollmentsLoading(true);
      setEnrollmentsError(null);

      try {
        const params = new URLSearchParams({ student_id: currentStudentId });
        const response = await fetch(
          `/api/liff/enrollments?${params.toString()}`,
          {
            headers: {
              "X-Line-User-Id": resolvedLineUserId,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          let message = "載入課程資訊失敗";
          try {
            const body = await response.json();
            message = body.error ?? message;
          } catch (parseError) {
            console.error("Failed to parse enrollments response", parseError);
          }
          throw new Error(message);
        }

        const body = await response.json();
        setEnrollments(body.data ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load enrollments", error);
        setEnrollments([]);
        setEnrollmentsError(
          error instanceof Error ? error.message : "載入課程資訊失敗"
        );
      } finally {
        if (!controller.signal.aborted) {
          setEnrollmentsLoading(false);
        }
      }
    };

    loadEnrollments();

    return () => controller.abort();
  }, [currentStudentId, resolvedLineUserId]);

  useEffect(() => {
    if (!currentStudentId) {
      setAttendanceItems([]);
      setAttendanceError(null);
      return;
    }

    if (!resolvedLineUserId) {
      return;
    }

    const controller = new AbortController();

    const loadAttendance = async (signal?: AbortSignal) => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        const params = new URLSearchParams({
          student_id: currentStudentId!,
        });
        if (attendanceRange.from) {
          params.set("from", attendanceRange.from);
        }
        if (attendanceRange.to) {
          params.set("to", attendanceRange.to);
        }

        const response = await fetch(
          `/api/liff/attendance?${params.toString()}`,
          {
            headers: {
              "X-Line-User-Id": resolvedLineUserId!,
            },
            signal,
          }
        );

        if (!response.ok) {
          let message = "載入出席紀錄失敗";
          try {
            const body = await response.json();
            message = body.error ?? message;
          } catch (parseError) {
            console.error("Failed to parse attendance response", parseError);
          }
          throw new Error(message);
        }

        const body = await response.json();
        setAttendanceItems(body.data ?? []);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        console.error("Failed to load attendance", error);
        setAttendanceItems([]);
        setAttendanceError(
          error instanceof Error ? error.message : "載入出席紀錄失敗"
        );
      } finally {
        if (!signal?.aborted) {
          setAttendanceLoading(false);
        }
      }
    };

    loadAttendance(controller.signal);

    return () => controller.abort();
  }, [attendanceRange, currentStudentId, resolvedLineUserId]);

  // 1. Derive Stats from Enrollments
  const stats: UIStats[] = enrollments.map((enrollment) => ({
    courseName: enrollment.class_name,
    attended: enrollment.attended_credits,
    remaining: enrollment.remaining_credits,
    total: enrollment.total_credits,
    expiryDate: enrollment.expiry_date ?? "未設定",
  }));

  // 2. Map attendance rows to UI format
  const attendanceList: UIAttendance[] = attendanceItems.map((item) => ({
    id: item.session_id,
    date: toDateLabel(item.session.start_time),
    time: formatTimeRange(item.session.start_time, item.session.end_time),
    courseName: item.session.class_name,
    status: deriveUiStatus(item),
  }));

  const weeklySessions = attendanceList
    .filter((s) => {
      const sDate = new Date(s.date);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();

      const diffToMon = (dayOfWeek + 6) % 7;
      const thisMon = new Date(today);
      thisMon.setDate(today.getDate() - diffToMon);

      const nextSun = new Date(thisMon);
      nextSun.setDate(thisMon.getDate() + 13);
      nextSun.setHours(23, 59, 59, 999);

      return sDate >= thisMon && sDate <= nextSun;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Handlers
  const handleLeaveClick = (session: UIAttendance) => {
    setSelectedSession(session);
    setIsLeaveModalOpen(true);
  };

  const confirmLeave = async () => {
    if (!selectedSession || !currentStudentId || !resolvedLineUserId) return;

    try {
      const response = await fetch("/api/liff/attendance/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Line-User-Id": resolvedLineUserId,
        },
        body: JSON.stringify({
          student_id: currentStudentId,
          session_id: selectedSession.id,
        }),
      });

      if (!response.ok) {
        let message = "請假申請失敗";
        try {
          const body = await response.json();
          message = body.error ?? message;
        } catch (e) {}
        throw new Error(message);
      }

      alert("請假申請已提交");
      setIsLeaveModalOpen(false);
      setSelectedSession(null);

      // Refresh attendance items
      const params = new URLSearchParams({
        student_id: currentStudentId,
      });
      if (attendanceRange.from) {
        params.set("from", attendanceRange.from);
      }
      if (attendanceRange.to) {
        params.set("to", attendanceRange.to);
      }

      const refreshRes = await fetch(
        `/api/liff/attendance?${params.toString()}`,
        {
          headers: {
            "X-Line-User-Id": resolvedLineUserId,
          },
        }
      );
      if (refreshRes.ok) {
        const body = await refreshRes.json();
        setAttendanceItems(body.data ?? []);
      }
    } catch (error) {
      console.error("Failed to submit leave", error);
      alert(
        error instanceof Error ? error.message : "請假申請失敗，請稍後再試"
      );
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

  // Helper to get sessions for a specific date (multiple sessions possible per day)
  const getSessionsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return attendanceList.filter((a) => a.date === dateStr);
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
  const getMembershipLabel = (tier?: string | null) => {
    const normalized = (tier ?? "NONE").toUpperCase();
    switch (normalized) {
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

  const getLevelLabel = (level?: string | null) => {
    if (!level) {
      return "未設定";
    }
    switch (level.toUpperCase()) {
      case "BEGINNER":
        return "初學";
      case "INTERMEDIATE":
        return "中階";
      case "ADVANCED":
        return "進階";
      default:
        return level;
    }
  };

  const getMembershipColor = (tier?: string | null) => {
    const normalized = (tier ?? "NONE").toUpperCase();
    switch (normalized) {
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

  if (studentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">載入學生資料中...</p>
      </div>
    );
  }

  if (studentsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-sm">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-base font-semibold text-red-600">
              無法載入學生資料
            </p>
            <p className="text-sm text-muted-foreground">{studentsError}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              重新整理
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!students.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-base font-semibold">尚未有學生資料</p>
            <p className="text-sm text-muted-foreground">
              請先於 LIFF 填寫學生資訊後再回到此頁面。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const student =
    students.find((s) => s.id === currentStudentId) ?? students[0]!;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex justify-between gap-3">
        <h1 className="text-xl font-bold">我的課程</h1>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {students.map((s) => (
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
          {enrollmentsLoading && (
            <Card className="shadow-sm">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                載入課程統計中...
              </CardContent>
            </Card>
          )}
          {enrollmentsError && !enrollmentsLoading && (
            <Card className="shadow-sm">
              <CardContent className="py-6 text-center text-sm text-red-600">
                {enrollmentsError}
              </CardContent>
            </Card>
          )}
          {!enrollmentsLoading && !enrollmentsError && stats.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                尚未有任何課程資料
              </CardContent>
            </Card>
          )}
          {!enrollmentsLoading &&
            !enrollmentsError &&
            stats.map((stat, idx) => (
              <Card key={idx} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{stat.courseName}</CardTitle>
                  <div className="text-xs text-muted-foreground font-normal mb-2">
                    使用期限: {stat.expiryDate}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-center items-center">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">已上</p>
                      <p className="text-xl font-bold text-green-600">
                        {stat.attended}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">剩餘</p>
                      <p className="text-xl font-bold text-blue-600">
                        {stat.remaining}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">總堂數</p>
                      <p className="text-xl font-bold text-gray-500">
                        {stat.total}
                      </p>
                    </div>
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
          {attendanceLoading && (
            <Card className="shadow-sm">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                載入課程中...
              </CardContent>
            </Card>
          )}
          {attendanceError && !attendanceLoading && (
            <Card className="shadow-sm">
              <CardContent className="py-6 text-center text-sm text-red-600">
                {attendanceError}
              </CardContent>
            </Card>
          )}
          {!attendanceLoading &&
            !attendanceError &&
            weeklySessions.length === 0 && (
              <Card className="shadow-sm">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  這兩週沒有課程安排
                </CardContent>
              </Card>
            )}
          {!attendanceLoading &&
            !attendanceError &&
            weeklySessions.map((session) => (
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
                      <p className="text-base font-bold">
                        {session.courseName}
                        <Badge
                          variant={getStatusBadgeVariant(session.status)}
                          className={cn(
                            "text-xs ml-2",
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
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{session.date}</span>
                      <span>{session.time}</span>
                    </div>
                  </div>
                  {session.status === "SCHEDULED" && (
                    <Button size="sm" onClick={() => handleLeaveClick(session)}>
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
                const sessions = getSessionsForDate(date);
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
                    <div className="flex flex-wrap items-center justify-center gap-0.5 mt-1 min-h-[0.4rem]">
                      {sessions.length > 0 ? (
                        sessions.map((session) => (
                          <span
                            key={session.id}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              getStatusColor(session.status)
                            )}
                          />
                        ))
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200/50" />
                      )}
                    </div>
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
          }}
        />
      )}
    </div>
  );
}

function formatDateParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

function toDateLabel(iso: string): string {
  return iso?.split("T")[0] ?? "";
}

function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTimeLabel(startIso)}-${formatTimeLabel(endIso)}`;
}

function formatTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function deriveUiStatus(item: AttendanceItem): UIAttendance["status"] {
  if (
    item.status === "PRESENT" ||
    item.status === "ABSENT" ||
    item.status === "LEAVE"
  ) {
    return item.status;
  }
  const sessionStart = Date.parse(item.session.start_time);
  if (Number.isNaN(sessionStart)) {
    return "SCHEDULED";
  }
  return sessionStart > Date.now() ? "SCHEDULED" : "COMPLETED";
}
