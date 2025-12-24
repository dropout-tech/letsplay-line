"use client";

import { use, useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShoppingCart, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiff } from "../../providers/liff-provider";

// Type definitions
interface StudentFormData {
  name: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  birthday: string;
  phone: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "";
  school_or_occupation: string;
}
interface Student {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  birthday: string;
  phone: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  school_or_occupation: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
interface VariationOption {
  value: string;
  label: string;
}

interface Condition {
  all?: Array<{ key: string; op: string; value: string }>;
}

interface Variation {
  key: string;
  label: string;
  type: "single" | "multi";
  options: VariationOption[];
  condition?: Condition;
}

interface Enrollment {
  class_id: string;
  credits: number;
}

interface Variant {
  key: string;
  values: Record<string, string | string[]>;
  price: number;
  enrollments?: Enrollment[];
}

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
  is_open: boolean;
  valid_from: string | null;
  valid_to: string | null;
  variations?: Variation[];
  variants?: Variant[];
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params Promise
  const { id } = use(params);

  // Get LIFF profile
  const { profile, isLoading: liffLoading } = useLiff();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [selections, setSelections] = useState<
    Record<string, string | string[]>
  >({});
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Student selection state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentForm, setStudentForm] = useState<StudentFormData>({
    name: "",
    gender: "",
    birthday: "",
    phone: "",
    level: "",
    school_or_occupation: "",
  });

  const devUserId = process.env.NEXT_PUBLIC_DEV_LIFF_USER_ID;

  const profileHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (profile?.displayName) {
      headers["X-Line-Display-Name"] = encodeURIComponent(profile.displayName);
    }
    if (profile?.pictureUrl) {
      headers["X-Line-Picture"] = encodeURIComponent(profile.pictureUrl);
    }
    if ((profile as any)?.email) {
      headers["X-Line-Email"] = encodeURIComponent((profile as any).email);
    }
    return headers;
  }, [profile]);

  // Load product data
  useEffect(() => {
    const userId = profile?.userId ?? devUserId;

    if (!userId) {
      if (!liffLoading) {
        setLoading(false);
        setError("請先登入 LINE 以查看課程資訊");
      }
      return;
    }

    const controller = new AbortController();

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/liff/products/${id}?include=variations,variants`,
          {
            headers: {
              "X-Line-User-Id": userId,
              ...profileHeaders,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          let errorMessage = "載入課程失敗";
          try {
            const body = await response.json();
            errorMessage = body.error ?? errorMessage;
          } catch (parseError) {
            console.error("Failed to parse error response", parseError);
          }
          throw new Error(errorMessage);
        }

        const body = await response.json();
        setProduct(body.data ?? null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load product:", error);
        setError(error instanceof Error ? error.message : "載入課程失敗");
        setProduct(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => controller.abort();
  }, [devUserId, id, liffLoading, profile?.userId]);

  // Load students owned by the current user
  useEffect(() => {
    const userId = profile?.userId ?? devUserId;
    if (!userId) {
      if (!liffLoading) {
        setStudentsLoading(false);
        setStudentsError("請先登入 LINE 以載入學生資料");
      }
      return;
    }

    const controller = new AbortController();

    const loadStudents = async () => {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const response = await fetch(`/api/liff/students`, {
          headers: {
            "X-Line-User-Id": userId,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = "載入學生資料失敗";
          try {
            const body = await response.json();
            message = body.error ?? message;
          } catch (parseError) {
            console.error("Failed to parse students error", parseError);
          }
          throw new Error(message);
        }

        const body = await response.json();
        setStudents(body.data ?? []);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load students", loadError);
        setStudents([]);
        setStudentsError(
          loadError instanceof Error ? loadError.message : "載入學生資料失敗"
        );
      } finally {
        if (!controller.signal.aborted) {
          setStudentsLoading(false);
        }
      }
    };

    loadStudents();

    return () => controller.abort();
  }, [devUserId, liffLoading, profile?.userId, profileHeaders]);

  // Default selection based on fetched students
  useEffect(() => {
    if (studentsLoading) return;
    if (!students.length) {
      setStudentForm({
        name: "",
        gender: "",
        birthday: "",
        phone: "",
        level: "",
        school_or_occupation: "",
      });
      return;
    } else if (!selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [selectedStudentId, students, studentsLoading]);

  // Student handlers
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (studentId === "new") {
      setStudentForm({
        name: "",
        gender: "",
        birthday: "",
        phone: "",
        level: "",
        school_or_occupation: "",
      });
    }
  };

  const handleStudentFormChange = (
    field: keyof StudentFormData,
    value: string
  ) => {
    setStudentForm((prev) => ({ ...prev, [field]: value }));
  };

  // Check if a variation should be displayed based on conditions
  const shouldShowVariation = (variation: Variation): boolean => {
    if (!variation.condition) return true;

    const { all } = variation.condition;
    if (!all) return true;

    return all.every((cond) => {
      const selectedValue = selections[cond.key];
      if (cond.op === "eq") {
        return selectedValue === cond.value;
      }
      return false;
    });
  };

  // Handle selection change
  const handleSelectionChange = (
    key: string,
    value: string | string[],
    type: "single" | "multi"
  ) => {
    setSelections((prev) => {
      const newSelections = { ...prev };

      if (type === "multi") {
        // For multi-select, toggle the value in the array
        const currentArray = Array.isArray(prev[key])
          ? (prev[key] as string[])
          : [];
        const valueStr = value as string;

        if (currentArray.includes(valueStr)) {
          newSelections[key] = currentArray.filter((v) => v !== valueStr);
        } else {
          newSelections[key] = [...currentArray, valueStr];
        }
      } else {
        // For single-select, set the value directly
        newSelections[key] = value;
      }

      return newSelections;
    });
  };

  // Find matching variant based on selections
  const selectedVariant = useMemo(() => {
    if (!product) return null;

    return (product.variants ?? []).find((variant) => {
      return Object.entries(variant.values).every(([key, value]) => {
        const selectedValue = selections[key];

        if (Array.isArray(value)) {
          // Multi-select: check if arrays match (order-independent)
          if (!Array.isArray(selectedValue)) return false;
          return (
            value.length === selectedValue.length &&
            value.every((v) => selectedValue.includes(v))
          );
        } else {
          // Single-select: exact match
          return selectedValue === value;
        }
      });
    });
  }, [product, selections]);

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      REGULAR: "團體班",
      BUNDLE: "套餐課程",
      CAMP: "營隊",
      PRIVATE: "個人班",
      GROUP_RENTAL: "包班",
    };
    return labels[category] || category;
  };

  const userIdForRequests = profile?.userId ?? devUserId ?? "";
  const isNewStudent = selectedStudentId === "new";
  const isStudentFormValid = useMemo(() => {
    if (!isNewStudent) return Boolean(selectedStudentId);
    return (
      Boolean(studentForm.name.trim()) &&
      Boolean(studentForm.gender) &&
      Boolean(studentForm.birthday) &&
      Boolean(studentForm.phone.trim()) &&
      Boolean(studentForm.level)
    );
  }, [isNewStudent, selectedStudentId, studentForm]);

  const canSubmitOrder = Boolean(
    product &&
      selectedVariant &&
      userIdForRequests &&
      isStudentFormValid &&
      !orderSubmitting
  );

  const createStudentIfNeeded = async (): Promise<string> => {
    if (!isNewStudent) {
      return selectedStudentId;
    }

    if (!userIdForRequests) {
      throw new Error("請先登入 LINE");
    }

    const response = await fetch(`/api/liff/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Line-User-Id": userIdForRequests,
        ...profileHeaders,
      },
      body: JSON.stringify({
        name: studentForm.name.trim(),
        gender: studentForm.gender,
        birthday: studentForm.birthday,
        phone: studentForm.phone.trim(),
        level: studentForm.level,
        school_or_occupation:
          studentForm.school_or_occupation.trim() || undefined,
      }),
    });

    if (!response.ok) {
      let message = "新增學生失敗";
      try {
        const body = await response.json();
        message = body.error ?? message;
      } catch (parseError) {
        console.error("Failed to parse student creation error", parseError);
      }
      throw new Error(message);
    }

    const body = await response.json();
    const created: Student | undefined = body.data;
    if (!created) {
      throw new Error("新增學生失敗");
    }

    setStudents((prev) => [...prev, created]);
    setSelectedStudentId(created.id);
    return created.id;
  };

  const handlePlaceOrder = async () => {
    if (!selectedVariant || !product) return;
    if (!userIdForRequests) {
      setOrderError("請先登入 LINE");
      return;
    }

    setOrderSubmitting(true);
    setOrderError(null);
    setOrderSuccess(null);

    try {
      const studentId = await createStudentIfNeeded();

      const response = await fetch(`/api/liff/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Line-User-Id": userIdForRequests,
        },
        body: JSON.stringify({
          student_id: studentId,
          product_id: product.id,
          variant_key: selectedVariant.key,
          quantity: 1,
          selections,
        }),
      });

      if (!response.ok) {
        let message = "報名失敗，請稍後再試";
        try {
          const body = await response.json();
          message = body.error ?? message;
        } catch (parseError) {
          console.error("Failed to parse order error", parseError);
        }
        throw new Error(message);
      }

      setOrderSuccess("報名成功，我們將盡快與您聯繫！");
    } catch (orderErr) {
      console.error("Failed to create order", orderErr);
      setOrderError(orderErr instanceof Error ? orderErr.message : "報名失敗");
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">載入失敗</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              重新整理
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">找不到課程</h2>
            <p className="text-muted-foreground mb-4">
              抱歉，無法找到您要查看的課程資訊
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        {/* User Profile */}
        {profile && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b">
            <div className="relative">
              {profile.pictureUrl ? (
                <img
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {profile.displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                ID: {profile.userId}
              </p>
            </div>
          </div>
        )}

        {/* Product Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{product.name}</h1>
          <Badge variant="secondary" className="text-xs">
            {getCategoryLabel(product.category)}
          </Badge>
        </div>
      </div>

      {/* HTML description here */}
      <div className="p-4">
        <div dangerouslySetInnerHTML={{ __html: product.description ?? "" }} />
      </div>

      <div className="p-4 space-y-6 pb-12">
        {/* Student Selection Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">學生資料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">選擇學生資料</label>
              <select
                aria-label="選擇學生資料"
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                disabled={studentsLoading}
              >
                <option value="">
                  {studentsLoading ? "載入中..." : "-- 選擇學生資料 --"}
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
                <option value="new">+ 新增學生資料</option>
              </select>
              {studentsError && (
                <p className="text-xs text-destructive">{studentsError}</p>
              )}
            </div>

            {/* Student Form - shown only when creating new student */}
            {isNewStudent && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1">
                  <label className="text-sm font-medium">姓名 *</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) =>
                      handleStudentFormChange("name", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                    placeholder="請輸入學生姓名"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">性別 *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "MALE", label: "男" },
                      { value: "FEMALE", label: "女" },
                      { value: "OTHER", label: "其他" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          handleStudentFormChange("gender", option.value)
                        }
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors",
                          studentForm.gender === option.value
                            ? "border-primary bg-primary/5"
                            : "border-gray-200"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">生日日期 *</label>
                  <input
                    aria-label="生日日期"
                    type="date"
                    value={studentForm.birthday}
                    onChange={(e) =>
                      handleStudentFormChange("birthday", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    電話號碼(聯絡的上的) *
                  </label>
                  <input
                    type="tel"
                    value={studentForm.phone}
                    onChange={(e) =>
                      handleStudentFormChange("phone", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                    placeholder="0912-345-678"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">程度 *</label>
                  <select
                    aria-label="程度"
                    value={studentForm.level}
                    onChange={(e) =>
                      handleStudentFormChange("level", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="">-- 選擇程度 --</option>
                    <option value="BEGINNER">初學</option>
                    <option value="INTERMEDIATE">中階</option>
                    <option value="ADVANCED">進階</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">就讀學校/職業</label>
                  <input
                    type="text"
                    value={studentForm.school_or_occupation}
                    onChange={(e) =>
                      handleStudentFormChange(
                        "school_or_occupation",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                    placeholder="請輸入學校或職業"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variations Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">選擇方案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(product.variations ?? [])
              .filter(shouldShowVariation)
              .map((variation) => (
                <div key={variation.key} className="space-y-2">
                  <label className="text-sm font-medium">
                    {variation.label}
                  </label>

                  {variation.type === "single" ? (
                    // Radio buttons for single-select
                    <div className="grid grid-cols-1 gap-2">
                      {variation.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            handleSelectionChange(
                              variation.key,
                              option.value,
                              "single"
                            )
                          }
                          className={cn(
                            "px-4 py-3 rounded-lg border-2 text-left transition-all",
                            selections[variation.key] === option.value
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Checkboxes for multi-select
                    <div className="grid grid-cols-1 gap-2">
                      {variation.options.map((option) => {
                        const isSelected =
                          Array.isArray(selections[variation.key]) &&
                          (selections[variation.key] as string[]).includes(
                            option.value
                          );

                        return (
                          <button
                            key={option.value}
                            onClick={() =>
                              handleSelectionChange(
                                variation.key,
                                option.value,
                                "multi"
                              )
                            }
                            className={cn(
                              "px-4 py-3 rounded-lg border-2 text-left transition-all",
                              isSelected
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                                  isSelected
                                    ? "border-primary bg-primary"
                                    : "border-gray-300"
                                )}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                              <span>{option.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
        {/* Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          {/* Price Display */}
          {selectedVariant && (
            <div className="flex justify-between items-center pb-3">
              <span className="text-lg font-medium">價格</span>
              <div className="text-right">
                <span className="text-3xl font-bold text-primary">
                  NT$ {selectedVariant.price.toLocaleString()}
                </span>
                {selectedVariant.enrollments &&
                  selectedVariant.enrollments.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedVariant.enrollments
                        .map((e) => e.credits)
                        .reduce((a, b) => a + b)}
                      堂
                    </p>
                  )}
              </div>
            </div>
          )}
          {orderError && (
            <p className="text-sm text-destructive pb-2">{orderError}</p>
          )}
          {orderSuccess && (
            <p className="text-sm text-emerald-600 pb-2">{orderSuccess}</p>
          )}
          {product.is_open ? (
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!canSubmitOrder}
              onClick={handlePlaceOrder}
            >
              <ShoppingCart size={20} />
              {orderSubmitting
                ? "提交中..."
                : selectedVariant
                ? "立即報名"
                : "請選擇方案"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-primary text-primary hover:bg-primary/5"
              size="lg"
            >
              <MessageCircle size={20} />
              聯繫客服
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
