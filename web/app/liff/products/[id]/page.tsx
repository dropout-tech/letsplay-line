"use client";

import { use, useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShoppingCart, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiff } from "../../providers/liff-provider";
import { mockStudents, Student } from "../../my-course/mock-data";

// Type definitions
interface StudentFormData {
  name: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  birthday: string;
  phone: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "";
  school_or_occupation: string;
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
  description: string;
  is_active: boolean;
  is_open: boolean;
  variations: Variation[];
  variants: Variant[];
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params Promise
  const { id } = use(params);

  // Get LIFF profile
  const { profile } = useLiff();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<
    Record<string, string | string[]>
  >({});

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

  // Filter students by LINE user ID
  const userStudents = mockStudents.filter((s) => s.userId === profile?.userId);

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch("/products.json");
        const products: Product[] = await response.json();
        const foundProduct = products.find((p) => p.id === id);
        setProduct(foundProduct || null);
      } catch (error) {
        console.error("Failed to load product:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Student handlers
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (studentId === "new") {
      // Reset form for new student
      setStudentForm({
        name: "",
        gender: "",
        birthday: "",
        phone: "",
        level: "",
        school_or_occupation: "",
      });
    } else if (studentId) {
      // Prefill form with existing student data
      const student = userStudents.find((s) => s.id === studentId);
      if (student) {
        setStudentForm({
          name: student.name,
          gender: student.gender,
          birthday: student.birthday,
          phone: student.phone || "",
          level: student.level.toUpperCase() as
            | "BEGINNER"
            | "INTERMEDIATE"
            | "ADVANCED",
          school_or_occupation: "",
        });
      }
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

    return product.variants.find((variant) => {
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
        <div dangerouslySetInnerHTML={{ __html: product.description }} />
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
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">-- 選擇學生資料 --</option>
                {userStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
                <option value="new">+ 新增學生資料</option>
              </select>
            </div>

            {/* Student Form - shown when existing student selected or "new" */}
            {(selectedStudentId === "new" || selectedStudentId) && (
              <div className="space-y-3 pt-2 border-t">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">姓名 *</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) =>
                      handleStudentFormChange("name", e.target.value)
                    }
                    disabled={selectedStudentId !== "new"}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg border-2 transition-colors",
                      selectedStudentId === "new"
                        ? "border-gray-200 focus:border-primary focus:outline-none"
                        : "bg-gray-50 border-gray-100 text-gray-600"
                    )}
                    placeholder="請輸入學生姓名"
                  />
                </div>

                {/* Gender */}
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
                        disabled={selectedStudentId !== "new"}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors",
                          studentForm.gender === option.value
                            ? "border-primary bg-primary/5"
                            : "border-gray-200",
                          selectedStudentId !== "new" &&
                            "bg-gray-50 text-gray-600"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Birthday */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">生日日期 *</label>
                  <input
                    type="date"
                    value={studentForm.birthday}
                    onChange={(e) =>
                      handleStudentFormChange("birthday", e.target.value)
                    }
                    disabled={selectedStudentId !== "new"}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg border-2 transition-colors",
                      selectedStudentId === "new"
                        ? "border-gray-200 focus:border-primary focus:outline-none"
                        : "bg-gray-50 border-gray-100 text-gray-600"
                    )}
                  />
                </div>

                {/* Phone */}
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
                    disabled={selectedStudentId !== "new"}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg border-2 transition-colors",
                      selectedStudentId === "new"
                        ? "border-gray-200 focus:border-primary focus:outline-none"
                        : "bg-gray-50 border-gray-100 text-gray-600"
                    )}
                    placeholder="0912-345-678"
                  />
                </div>

                {/* Level */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">程度 *</label>
                  <select
                    value={studentForm.level}
                    onChange={(e) =>
                      handleStudentFormChange("level", e.target.value)
                    }
                    disabled={selectedStudentId !== "new"}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg border-2 transition-colors",
                      selectedStudentId === "new"
                        ? "border-gray-200 focus:border-primary focus:outline-none"
                        : "bg-gray-50 border-gray-100 text-gray-600"
                    )}
                  >
                    <option value="">-- 選擇程度 --</option>
                    <option value="BEGINNER">初學</option>
                    <option value="INTERMEDIATE">中階</option>
                    <option value="ADVANCED">進階</option>
                  </select>
                </div>

                {/* School/Occupation */}
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
            {product.variations.filter(shouldShowVariation).map((variation) => (
              <div key={variation.key} className="space-y-2">
                <label className="text-sm font-medium">{variation.label}</label>

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
          {product.is_open ? (
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!selectedVariant}
            >
              <ShoppingCart size={20} />
              {selectedVariant ? "立即報名" : "請選擇方案"}
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
