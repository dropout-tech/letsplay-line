import { BadRequestError, NotFoundError } from "@/server/errors";
import {
    getOrderById,
    listOrders,
    type JsonValue,
    type ListOrdersFilters,
    type OrderRecord,
    updateOrderFulfillment,
} from "@/server/repos/orders-repo";
import {
    listStudentsByIds,
    type StudentRecord,
} from "@/server/repos/students-repo";
import {
    listUsersByLineIds,
    type UserRecord,
} from "@/server/repos/users-repo";
import {
    listProductsByIds,
    type ProductSummaryRecord,
} from "@/server/repos/products-repo";
import { upsertEnrollmentCredits } from "@/server/repos/enrollments-repo";
import { getClassById, type ClassRecord } from "@/server/repos/classes-repo";
import {
    createSessions,
    listSessionsByClass,
    type CreateSessionInput,
    type SessionRecord,
} from "@/server/repos/sessions-repo";
import {
    createAttendanceRecords,
    listAttendanceByStudentAndSessions,
    type AttendanceRecord,
} from "@/server/repos/attendance-repo";

export type AdminOrderListFilters = ListOrdersFilters;

export type AdminOrderListItem = {
    order: OrderRecord;
    student: Pick<StudentRecord, "id" | "name" | "level"> | null;
    user: Pick<UserRecord, "line_id" | "display_name" | "email"> | null;
    summary: OrderSummary;
};

export type OrderSummary = {
    title: string;
    detail?: string;
};

export type PaymentPreviewResult = {
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

export const listAdminOrders = async (
    filters: AdminOrderListFilters = {}
): Promise<AdminOrderListItem[]> => {
    const orders = await listOrders(filters);
    if (orders.length === 0) {
        return [];
    }

    const parsedItems = new Map<string, ParsedOrderItem[]>();
    const studentIds: string[] = [];
    const userIds: string[] = [];
    const productIds: string[] = [];

    for (const order of orders) {
        studentIds.push(order.student_id);
        userIds.push(order.user_id);

        const items = parseOrderItems(order.order_items);
        parsedItems.set(order.id, items);
        items.forEach((item) => {
            productIds.push(item.productId);
        });
    }

    const [students, users, products] = await Promise.all([
        listStudentsByIds(uniqueIds(studentIds)),
        listUsersByLineIds(uniqueIds(userIds)),
        listProductsByIds(uniqueIds(productIds)),
    ]);

    const studentMap = new Map(students.map((student) => [student.id, student]));
    const userMap = new Map(users.map((user) => [user.line_id, user]));
    const productMap = new Map(products.map((product) => [product.id, product]));

    return orders.map((order) => {
        const items = parsedItems.get(order.id) ?? [];
        return {
            order,
            student: mapStudentSummary(studentMap.get(order.student_id)),
            user: mapUserSummary(userMap.get(order.user_id)),
            summary: summarizeItems(items, productMap),
        } satisfies AdminOrderListItem;
    });
};

export const previewAdminOrderPayment = async (
    orderId: string,
    creditsOverrides: Record<string, number> = {}
): Promise<PaymentPreviewResult> => {
    const { order, products } = await loadOrderContext(orderId);
    if (order.status !== "PENDING_PAYMENT") {
        throw new BadRequestError("訂單狀態非等待付款");
    }

    const { preview } = await fulfillOrderCredits({
        order,
        now: new Date(),
        dryRun: true,
        products,
        creditsOverrides,
    });

    return preview!;
};

export const confirmAdminOrderPayment = async (
    orderId: string,
    now = new Date(),
    excludedSessionIds: string[] = [],
    creditsOverrides: Record<string, number> = {}
): Promise<OrderRecord> => {
    const { order } = await loadOrderContext(orderId);

    if (order.status !== "PENDING_PAYMENT") {
        throw new BadRequestError("訂單狀態非等待付款");
    }

    const { fulfilledItems } = await fulfillOrderCredits({
        order,
        now,
        dryRun: false,
        excludedSessionIds,
        creditsOverrides,
    });
    const paidAt = now.toISOString();

    return await updateOrderFulfillment(order.id, {
        status: "PAID",
        paid_at: paidAt,
        order_items: fulfilledItems as JsonValue,
    });
};

const loadOrderContext = async (orderId: string) => {
    const normalizedId = orderId.trim();
    if (!normalizedId) {
        throw new BadRequestError("缺少訂單編號");
    }

    const order = await getOrderById(normalizedId);
    if (!order) {
        throw new NotFoundError("找不到訂單");
    }

    const parsedItems = parseOrderItems(order.order_items);
    const productIds = uniqueIds(parsedItems.map((i) => i.productId));
    const products = await listProductsByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    return { order, products: productMap };
};

const mapStudentSummary = (
    student?: StudentRecord
): Pick<StudentRecord, "id" | "name" | "level"> | null => {
    if (!student) {
        return null;
    }
    return {
        id: student.id,
        name: student.name,
        level: student.level,
    };
};

const mapUserSummary = (
    user?: UserRecord
): Pick<UserRecord, "line_id" | "display_name" | "email"> | null => {
    if (!user) {
        return null;
    }
    return {
        line_id: user.line_id,
        display_name: user.display_name,
        email: user.email,
    };
};

type ParsedOrderItem = {
    key: string;
    productId: string;
    variantKey: string | undefined;
    variantName: string | null;
    quantity: number;
    subtotal: number | undefined;
};

const parseOrderItems = (value: unknown): ParsedOrderItem[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (!item || typeof item !== "object") {
                return null;
            }
            const snapshot = item as Record<string, unknown>;
            const productId =
                typeof snapshot.product_id === "string"
                    ? snapshot.product_id
                    : undefined;
            const variantKey =
                typeof snapshot.variant_key === "string"
                    ? snapshot.variant_key
                    : undefined;
            const variantName =
                typeof snapshot.variant_name === "string"
                    ? snapshot.variant_name
                    : null;
            const quantity =
                typeof snapshot.quantity === "number" ? snapshot.quantity : undefined;
            const subtotal =
                typeof snapshot.line_item_total === "number"
                    ? snapshot.line_item_total
                    : undefined;

            if (!productId || typeof quantity !== "number") {
                return null;
            }

            return {
                key: `${productId}-${variantKey ?? "variant"}-${index}`,
                productId,
                variantKey,
                variantName,
                quantity,
                subtotal,
            } satisfies ParsedOrderItem;
        })
        .filter((item): item is ParsedOrderItem => Boolean(item));
};

const summarizeItems = (
    items: ParsedOrderItem[],
    productMap: Map<string, ProductSummaryRecord>
): OrderSummary => {
    if (items.length === 0) {
        return { title: "沒有商品資料" };
    }

    if (items.length === 1) {
        const item = items[0];
        return {
            title: resolveProductName(item.productId, productMap),
            detail: formatVariantLabel(item),
        };
    }

    const first = items[0];
    const detailList = items
        .slice(0, 3)
        .map(
            (entry) =>
                `${resolveProductName(entry.productId, productMap)}（${formatVariantLabel(
                    entry
                )}）x${entry.quantity}`
        )
        .join("、");

    return {
        title: `${resolveProductName(first.productId, productMap)} 等 ${items.length} 項`,
        detail: detailList,
    };
};

const resolveProductName = (
    productId: string,
    productMap: Map<string, ProductSummaryRecord>
): string => {
    return productMap.get(productId)?.name ?? `產品 ${productId}`;
};

const formatVariantLabel = (item: ParsedOrderItem): string => {
    return item.variantName ?? item.variantKey ?? "未命名方案";
};

const uniqueIds = (values: string[]): string[] => [
    ...new Set(values.filter((value): value is string => Boolean(value))),
];


type FulfillmentEnrollmentSnapshot = {
    classId: string;
    creditsPerUnit: number;
    raw: Record<string, unknown>;
};

type SessionCache = Map<string, SessionRecord[]>;

type FulfillmentContext = {
    order: OrderRecord;
    now: Date;
    dryRun: boolean;
    products?: Map<string, ProductSummaryRecord>;
    excludedSessionIds?: string[];
    creditsOverrides?: Record<string, number>;
};

const fulfillOrderCredits = async (
    ctx: FulfillmentContext
): Promise<{
    fulfilledItems: Record<string, unknown>[];
    preview?: PaymentPreviewResult;
}> => {
    const { order, now, dryRun, excludedSessionIds, creditsOverrides } = ctx;
    const items = parseOrderItems(order.order_items);
    if (items.length === 0) {
        throw new BadRequestError("訂單不含可報名的班級");
    }

    const parsedItems = parseFulfillmentOrderItems(
        order.order_items,
        ctx.products
    );

    const classCache = new Map<string, ClassRecord>();
    const sessionCache: SessionCache = new Map();
    const allocatedSessions = new Set<string>();
    const excludedSessionSet = new Set(excludedSessionIds || []);
    const nowIso = now.toISOString();

    const fulfilledItems: Record<string, unknown>[] = [];
    const previewItems: PaymentPreviewResult["items"] = [];

    for (const item of parsedItems) {
        const updatedEnrollments: Record<string, unknown>[] = [];
        const previewEnrollments: PaymentPreviewResult["items"][number]["enrollments"] =
            [];

        for (let i = 0; i < item.enrollments.length; i++) {
            const enrollment = item.enrollments[i];
            const overrideKey = `${item.key}-${i}`;
            const overrideCredits = creditsOverrides?.[overrideKey];

            const totalCredits = overrideCredits !== undefined
                ? overrideCredits
                : enrollment.creditsPerUnit * item.quantity;

            // Allow 0 for exclusion
            if (!Number.isFinite(totalCredits) || totalCredits < 0) {
                throw new BadRequestError("堂數必須大於0");
            }

            let fulfillment: EnrollmentFulfillmentResult;
            if (totalCredits > 0) {
                fulfillment = await applyEnrollmentFulfillment({
                    studentId: order.student_id,
                    classId: enrollment.classId,
                    credits: Math.trunc(totalCredits),
                    now,
                    nowIso,
                    classCache,
                    sessionCache,
                    allocatedSessions,
                    dryRun,
                    excludedSessionSet,
                });
            } else {
                fulfillment = {
                    enrollmentId: "temp-omitted",
                    expiryDate: null,
                    appliedAt: nowIso,
                    className: enrollment.classId,
                    allocatedSessions: [],
                };
            }

            updatedEnrollments.push({
                ...enrollment.raw,
                class_id: enrollment.classId,
                credits_added: Math.trunc(totalCredits),
                enrollment_id: fulfillment.enrollmentId,
                expiry_date: fulfillment.expiryDate,
                applied_at: fulfillment.appliedAt,
            });

            if (dryRun) {
                previewEnrollments.push({
                    className: fulfillment.className || enrollment.classId,
                    creditsToAdd: Math.trunc(totalCredits),
                    sessions: fulfillment.allocatedSessions.map((s) => ({
                        id: s.id,
                        date: s.start_time.split("T")[0],
                        startTime: s.start_time,
                        endTime: s.end_time,
                        isNew: s.id.startsWith("temp-"),
                    })),
                });
            }
        }

        fulfilledItems.push({
            ...item.raw,
            quantity: item.quantity,
            enrollments: updatedEnrollments,
        });

        if (dryRun) {
            previewItems.push({
                key: item.key,
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                enrollments: previewEnrollments,
            });
        }
    }

    return {
        fulfilledItems,
        preview: dryRun ? { items: previewItems } : undefined,
    };
};

type FulfillmentOrderItem = {
    key: string;
    raw: Record<string, unknown>;
    quantity: number;
    enrollments: FulfillmentEnrollmentSnapshot[];
    productName: string;
    variantName: string;
};

const parseFulfillmentOrderItems = (
    value: unknown,
    products?: Map<string, ProductSummaryRecord>
): FulfillmentOrderItem[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry, index) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }
            const raw = entry as Record<string, unknown>;
            const quantity = normalizeOrderItemQuantity(raw.quantity);
            const enrollments = parseOrderItemEnrollments(raw.enrollments);
            if (enrollments.length === 0) {
                return null;
            }
            const productId = raw.product_id as string;
            const variantKey = raw.variant_key as string | undefined;
            const product = products?.get(productId);
            return {
                key: `${productId}-${variantKey ?? "variant"}-${index}`,
                raw,
                quantity,
                enrollments,
                productName: product?.name || "未知商品",
                variantName: (raw.variant_name as string) || "標準規格",
            } satisfies FulfillmentOrderItem;
        })
        .filter((item): item is FulfillmentOrderItem => Boolean(item));
};

const parseOrderItemEnrollments = (
    value: unknown
): FulfillmentEnrollmentSnapshot[] => {
    if (!Array.isArray(value)) {
        throw new BadRequestError("訂單項目缺少報名資訊");
    }

    const enrollments = value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }
            const raw = entry as Record<string, unknown>;
            const classId = typeof raw.class_id === "string" ? raw.class_id.trim() : "";
            if (!classId) {
                return null;
            }
            const credits = normalizeCreditsValue(raw.credits_added);

            return {
                classId,
                creditsPerUnit: credits,
                raw,
            } satisfies FulfillmentEnrollmentSnapshot;
        })
        .filter((entry): entry is FulfillmentEnrollmentSnapshot => Boolean(entry));

    if (enrollments.length === 0) {
        throw new BadRequestError("訂單項目未指定任何班級");
    }

    return enrollments;
};

const normalizeOrderItemQuantity = (value: unknown): number => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        throw new BadRequestError("訂單項目數量遺失或無效");
    }
    const quantity = Math.trunc(value);
    if (quantity <= 0) {
        throw new BadRequestError("訂單項目數量必須大於零");
    }
    return quantity;
};

const normalizeCreditsValue = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new BadRequestError("班級堂數必須是數字");
    }
    const credits = Math.trunc(value);
    if (credits <= 0) {
        throw new BadRequestError("班級堂數必須大於零");
    }
    return credits;
};

type EnrollmentFulfillmentParams = {
    studentId: string;
    classId: string;
    credits: number;
    now: Date;
    nowIso: string;
    classCache: Map<string, ClassRecord>;
    sessionCache: SessionCache;
    allocatedSessions: Set<string>;
    dryRun: boolean;
    excludedSessionSet: Set<string>;
};

type EnrollmentFulfillmentResult = {
    enrollmentId: string;
    expiryDate: string | null;
    appliedAt: string;
    className?: string;
    allocatedSessions: SessionRecord[];
};

const applyEnrollmentFulfillment = async (
    params: EnrollmentFulfillmentParams
): Promise<EnrollmentFulfillmentResult> => {
    const {
        studentId,
        classId,
        credits,
        now,
        nowIso,
        classCache,
        sessionCache,
        dryRun,
        excludedSessionSet
    } = params;

    if (credits <= 0) {
        throw new BadRequestError("堂數必須大於零");
    }

    const classRecord = await loadClassRecord(classId, classCache);
    if (!classRecord.is_active) {
        throw new BadRequestError(`班級 ${classId} 已停用`);
    }

    let enrollmentId = "temp-enrollment-id";
    let expiryDate: string | null = null;

    if (!dryRun) {
        const enrollment = await upsertEnrollmentCredits({
            student_id: studentId,
            class_id: classId,
            credits,
        });
        enrollmentId = enrollment.id;
        expiryDate = enrollment.expiry_date;
    }

    const allocatedSessions = await allocateAttendanceSlots({
        classRecord,
        studentId,
        credits,
        now,
        nowIso,
        sessionCache,
        allocatedSessions: params.allocatedSessions,
        dryRun,
        excludedSessionSet
    });

    return {
        enrollmentId,
        expiryDate,
        appliedAt: nowIso,
        className: classRecord.title,
        allocatedSessions,
    } satisfies EnrollmentFulfillmentResult;
};

type AttendanceAllocationParams = {
    classRecord: ClassRecord;
    studentId: string;
    credits: number;
    now: Date;
    nowIso: string;
    sessionCache: SessionCache;
    allocatedSessions: Set<string>;
    dryRun: boolean;
    excludedSessionSet: Set<string>;
};

const allocateAttendanceSlots = async (
    params: AttendanceAllocationParams
): Promise<SessionRecord[]> => {
    const {
        classRecord,
        studentId,
        credits,
        now,
        nowIso,
        sessionCache,
        allocatedSessions,
        dryRun,
        excludedSessionSet
    } = params;

    if (credits <= 0) {
        return [];
    }

    let sessions = await ensureSessionsForClass({
        classRecord,
        minimumCount: credits,
        now,
        nowIso,
        sessionCache,
        dryRun,
    });

    let attendance = await loadAttendanceForSessions(
        studentId,
        sessions,
        allocatedSessions
    );
    let availableSessions = filterSessionsWithoutAttendance(sessions, attendance);

    while (availableSessions.length < credits) {
        const missing = credits - availableSessions.length;
        sessions = await ensureSessionsForClass({
            classRecord,
            minimumCount: sessions.length + missing,
            now,
            nowIso,
            sessionCache,
            dryRun,
        });
        attendance = await loadAttendanceForSessions(
            studentId,
            sessions,
            allocatedSessions
        );
        availableSessions = filterSessionsWithoutAttendance(sessions, attendance);
        if (missing <= 0) {
            break;
        }
    }

    const targetSessions = availableSessions.slice(0, credits);
    if (targetSessions.length < credits) {
        throw new BadRequestError(
            `無法為班級 ${classRecord.id} 分配 ${credits} 場次`
        );
    }

    // Filter out sessions that the user specifically excluded in the preview
    // Note: We use a helper to check for both real IDs and stable temp IDs
    const finalSessions = targetSessions.filter(s => {
        if (excludedSessionSet.has(s.id)) return false;
        const stableTempId = `temp-${s.class_id}-${s.start_time}`;
        if (excludedSessionSet.has(stableTempId)) return false;
        return true;
    });

    // Track these as allocated so subsequent loops (in the same transaction/request) don't pick them
    // We track targetSessions (the full window) to ensure excluded slots aren't picked by next items
    targetSessions.forEach((s) => allocatedSessions.add(s.id));

    if (!dryRun) {
        if (finalSessions.length > 0) {
            await createAttendanceRecords(
                finalSessions.map((session) => ({
                    session_id: session.id,
                    student_id: studentId,
                    status: "UNRECORDED",
                    credits_used: 1,
                }))
            );
        }
    }

    return finalSessions;
};

const loadAttendanceForSessions = async (
    studentId: string,
    sessions: SessionRecord[],
    allocatedSessions: Set<string>
): Promise<Set<string>> => {
    if (sessions.length === 0) {
        return new Set();
    }
    // Filter out temp sessions (dry run) - they definitely don't have attendance in DB
    // But they might be in `allocatedSessions` if we are in a multi-item loop
    const realSessionIds = sessions
        .filter((s) => !s.id.startsWith("temp-"))
        .map((s) => s.id);

    const occupiedIds = new Set<string>();

    if (realSessionIds.length > 0) {
        const uniqueIds = Array.from(new Set(realSessionIds));
        const records = await listAttendanceByStudentAndSessions(
            studentId,
            uniqueIds
        );
        records.forEach((r) => occupiedIds.add(r.session_id));
    }

    // Add sessions that we have already decided to allocate in this request
    sessions.forEach((s) => {
        if (allocatedSessions.has(s.id)) {
            occupiedIds.add(s.id);
        }
    });

    return occupiedIds;
};

const filterSessionsWithoutAttendance = (
    sessions: SessionRecord[],
    occupiedIds: Set<string>
): SessionRecord[] => {
    return sessions.filter((session) => !occupiedIds.has(session.id));
};

type EnsureSessionsParams = {
    classRecord: ClassRecord;
    minimumCount: number;
    now: Date;
    nowIso: string;
    sessionCache: SessionCache;
    dryRun: boolean;
};

const ensureSessionsForClass = async (
    params: EnsureSessionsParams
): Promise<SessionRecord[]> => {
    const { classRecord, minimumCount, now, nowIso, sessionCache, dryRun } = params;

    if (minimumCount <= 0) {
        return [];
    }

    const existing = await loadSessionCache(classRecord, sessionCache, nowIso);
    if (existing.length >= minimumCount) {
        return existing;
    }

    const additionalCount = minimumCount - existing.length;
    const newSessionInputs = await generateSessionsForClass({
        classRecord,
        existingSessions: existing,
        count: additionalCount,
        now,
    });

    let newSessions: SessionRecord[] = [];
    if (newSessionInputs.length > 0) {
        if (dryRun) {
            // Fake creating sessions
            newSessions = newSessionInputs.map(
                (input) =>
                ({
                    id: `temp-${classRecord.id}-${input.start_time}`,
                    ...input,
                    created_at: nowIso,
                    updated_at: nowIso,
                } as SessionRecord)
            );
        } else {
            // Actually create
            newSessions = await createSessions(newSessionInputs);
        }
    }

    const merged = [...existing, ...newSessions].sort(compareByStartTime);
    sessionCache.set(classRecord.id, merged);
    return merged;
};

const loadSessionCache = async (
    classRecord: ClassRecord,
    sessionCache: SessionCache,
    nowIso: string
): Promise<SessionRecord[]> => {
    const cached = sessionCache.get(classRecord.id);
    if (cached) {
        return cached;
    }
    const sessions = await listSessionsByClass(classRecord.id, {
        startFrom: nowIso,
    });
    sessionCache.set(classRecord.id, sessions);
    return sessions;
};

type GenerateSessionsParams = {
    classRecord: ClassRecord;
    existingSessions: SessionRecord[];
    count: number;
    now: Date;
};

const generateSessionsForClass = async (
    params: GenerateSessionsParams
): Promise<CreateSessionInput[]> => {
    const { classRecord, existingSessions, count, now } = params;
    if (count <= 0) {
        return [];
    }

    const intervalMs = determineSessionIntervalMs(classRecord);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        throw new BadRequestError(
            `班級 ${classRecord.id} 缺少重複設定`
        );
    }

    const durationMs = determineSessionDurationMs(classRecord);

    let cursor: Date;
    if (existingSessions.length > 0) {
        cursor = new Date(existingSessions[existingSessions.length - 1].start_time);
    } else {
        if (!classRecord.start_time) {
            throw new BadRequestError(
                `班級 ${classRecord.id} 缺少開始時間，無法建立場次`
            );
        }
        cursor = alignSeedToFuture(new Date(classRecord.start_time), now, intervalMs);
    }

    const inputs: CreateSessionInput[] = [];
    for (let i = 0; i < count; i++) {
        // Correct logic: if we have existing sessions, we start from the last one + interval
        // If we don't, 'cursor' is already the first valid slot (aligned to future), so use it as is for i=0
        if (existingSessions.length > 0 || i > 0) {
            cursor = new Date(cursor.getTime() + intervalMs);
        }
        const endTime = new Date(cursor.getTime() + durationMs);
        inputs.push({
            class_id: classRecord.id,
            coach_ids: classRecord.coach_ids ?? null,
            branch_id: classRecord.branch_id ?? null,
            start_time: cursor.toISOString(),
            end_time: endTime.toISOString(),
            status: "SCHEDULED",
            salary_status: "PENDING",
        });
    }

    return inputs;
};

const loadClassRecord = async (
    classId: string,
    cache: Map<string, ClassRecord>
): Promise<ClassRecord> => {
    const cached = cache.get(classId);
    if (cached) {
        return cached;
    }
    const record = await getClassById(classId);
    if (!record) {
        throw new NotFoundError(`找不到班級 ${classId}`);
    }
    cache.set(classId, record);
    return record;
};

const determineSessionIntervalMs = (classRecord: ClassRecord): number => {
    const rule = classRecord.recurrence_rule ?? "";
    const dayMs = 24 * 60 * 60 * 1000;

    if (rule.includes("DAILY")) {
        return dayMs;
    }
    if (rule.includes("MONTHLY")) {
        return 30 * dayMs;
    }
    if (rule.includes("WEEKLY")) {
        return 7 * dayMs;
    }

    if (classRecord.type === "CAMP") {
        return dayMs;
    }

    return 7 * dayMs;
};

const determineSessionDurationMs = (classRecord: ClassRecord): number => {
    if (classRecord.start_time && classRecord.end_time) {
        const start = Date.parse(classRecord.start_time);
        const end = Date.parse(classRecord.end_time);
        if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
            return end - start;
        }
    }

    return 90 * 60 * 1000;
};

const alignSeedToFuture = (seed: Date, now: Date, intervalMs: number): Date => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        return seed;
    }
    let candidate = new Date(seed.getTime());
    while (candidate.getTime() < now.getTime()) {
        candidate = new Date(candidate.getTime() + intervalMs);
    }
    return candidate;
};

const compareByStartTime = (a: SessionRecord, b: SessionRecord): number => {
    if (a.start_time === b.start_time) {
        return 0;
    }
    return a.start_time < b.start_time ? -1 : 1;
};
