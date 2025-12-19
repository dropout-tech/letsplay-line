import { BadRequestError, NotFoundError } from "@/server/errors";
import { createOrder, type OrderRecord } from "@/server/repos/orders-repo";
import { assertStudentOwnership } from "@/server/services/liff/students";
import {
    getProductById,
    saveProductVersions,
    type JsonValue,
    type ProductCategory,
    type ProductRecord,
} from "@/server/repos/products-repo";
import type {
    VariantDefinition,
    VariantEnrollment,
} from "@/server/services/liff/products";

export type CreateOrderPayload = {
    student_id?: unknown;
    product_id?: unknown;
    variant_key?: unknown;
    quantity?: unknown;
    selections?: unknown;
};

export type LiffOrderResponse = OrderRecord;

export const createPendingOrder = async (
    lineUserId: string,
    payload: CreateOrderPayload
): Promise<LiffOrderResponse> => {
    const input = validateOrderPayload(payload);

    const student = await assertStudentOwnership(input.student_id, lineUserId);

    const product = await getProductById(input.product_id);
    if (!product || !product.is_active) {
        throw new NotFoundError("Product not found");
    }
    if (!product.is_open) {
        throw new BadRequestError("Product is not available for purchase");
    }

    const variant = findVariant(product.variants, input.variant_key);
    if (!variant) {
        throw new BadRequestError("Selected variant is not available");
    }

    if (typeof variant.price !== "number" || Number.isNaN(variant.price)) {
        throw new BadRequestError("Variant is missing pricing information");
    }

    const unitPrice = variant.price;
    const subtotal = unitPrice * input.quantity;

    const versionId = await resolveProductVersionId(product);
    const orderItems: OrderItemSnapshot[] = [
        {
            product_id: product.id,
            version_id: versionId,
            variant_key: variant.key,
            variant_name: variant.name ?? null,
            quantity: input.quantity,
            line_item_total: subtotal,
            enrollments: buildEnrollmentSnapshots(variant.enrollments),
        },
    ];

    return await createOrder({
        user_id: student.user_id,
        student_id: student.id,
        order_items: orderItems,
        total_amount: subtotal,
        discount_amount: 0,
        final_price: subtotal,
        status: "PENDING_PAYMENT",
    });
};

const validateOrderPayload = (
    payload: CreateOrderPayload
): {
    student_id: string;
    product_id: string;
    variant_key: string;
    quantity: number;
    selections?: Record<string, string | string[]>;
} => {
    const studentId = assertId(payload.student_id, "student_id");
    const productId = assertId(payload.product_id, "product_id");

    const variantKey =
        typeof payload.variant_key === "string" ? payload.variant_key.trim() : "";
    if (!variantKey) {
        throw new BadRequestError("variant_key is required");
    }

    const quantity = normalizeQuantity(payload.quantity);
    const selections = sanitizeSelections(payload.selections);

    return { student_id: studentId, product_id: productId, variant_key: variantKey, quantity, selections };
};

const assertId = (value: unknown, field: string): string => {
    if (typeof value !== "string" || !value.trim()) {
        throw new BadRequestError(`${field} is required`);
    }
    return value.trim();
};

const normalizeQuantity = (value: unknown): number => {
    if (typeof value !== "number") {
        throw new BadRequestError("quantity must be a number");
    }
    const intValue = Math.trunc(value);
    if (intValue < 1 || intValue > 100) {
        throw new BadRequestError("quantity must be between 1 and 100");
    }
    return intValue;
};

const sanitizeSelections = (
    value: unknown
): Record<string, string | string[]> | undefined => {
    if (value == null) {
        return undefined;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new BadRequestError("selections must be an object");
    }

    const entries: [string, string | string[]][] = [];
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (typeof val === "string") {
            entries.push([key, val]);
        } else if (
            Array.isArray(val) &&
            val.every((item) => typeof item === "string")
        ) {
            entries.push([key, val]);
        } else {
            throw new BadRequestError("Selections must be string or string[]");
        }
    }

    return Object.fromEntries(entries);
};

const findVariant = (
    variants: unknown,
    targetKey: string
): VariantDefinition | undefined => {
    if (!Array.isArray(variants)) {
        return undefined;
    }
    const typed = variants as VariantDefinition[];
    return typed.find((variant) => variant?.key === targetKey);
};

type OrderItemSnapshot = {
    product_id: string;
    version_id: string | null;
    variant_key: string;
    variant_name: string | null;
    quantity: number;
    line_item_total: number;
    enrollments: OrderItemEnrollmentSnapshot[];
};

type OrderItemEnrollmentSnapshot = {
    class_id: string;
    credits_added: number;
    enrollment_id: string | null;
    expiry_date: string | null;
    applied_at: string | null;
};

const buildEnrollmentSnapshots = (
    enrollments: VariantEnrollment[] | undefined
): OrderItemEnrollmentSnapshot[] => {
    if (!Array.isArray(enrollments)) {
        return [];
    }

    return enrollments.map((definition) => ({
        class_id: definition.class_id,
        credits_added: definition.credits,
        enrollment_id: null,
        expiry_date: null,
        applied_at: null,
    }));
};

const resolveProductVersionId = async (
    product: ProductRecord
): Promise<string | null> => {
    const latestEntry = getLatestVersionEntry(product.versions);
    const lastSavedAt = parseTimestamp(product.last_saved_at ?? null);
    const latestEntryCreatedAt = parseTimestamp(latestEntry?.created_at);

    const hasFreshSnapshot =
        Boolean(latestEntry) &&
        lastSavedAt !== null &&
        latestEntryCreatedAt !== null &&
        lastSavedAt <= latestEntryCreatedAt;

    if (hasFreshSnapshot) {
        return latestEntry!.id;
    }

    const now = new Date();
    const versionId = formatVersionId(product.id, now);
    const snapshot = buildProductSnapshot(product);
    const newEntry: ProductVersionEntry = {
        id: versionId,
        created_at: now.toISOString(),
        updated_at: product.updated_at,
        snapshot,
    };

    const existingVersions = Array.isArray(product.versions)
        ? [...product.versions]
        : [];
    await saveProductVersions(
        product.id,
        [...existingVersions, newEntry],
    );

    return versionId;
};

type ProductSnapshot = {
    id: string;
    name: string;
    description: string | null;
    category: ProductCategory;
    variations: JsonValue | null;
    variants: JsonValue | null;
    is_open: boolean;
    is_active: boolean;
    valid_from: string | null;
    valid_to: string | null;
    created_at: string;
    updated_at: string;
};

type ProductVersionEntry = {
    id: string;
    created_at: string;
    updated_at: string;
    snapshot: ProductSnapshot;
};

const buildProductSnapshot = (product: ProductRecord): ProductSnapshot => ({
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    variations: product.variations,
    variants: product.variants,
    is_open: product.is_open,
    is_active: product.is_active,
    valid_from: product.valid_from,
    valid_to: product.valid_to,
    created_at: product.created_at,
    updated_at: product.updated_at,
});

const getLatestVersionEntry = (
    versions: JsonValue | null
): ProductVersionEntry | null => {
    if (!Array.isArray(versions) || versions.length === 0) {
        return null;
    }

    const latest = versions[versions.length - 1];
    if (!latest || typeof latest !== "object") {
        return null;
    }

    const entry = latest as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : null;
    const createdAt = typeof entry.created_at === "string" ? entry.created_at : null;
    const updatedAt = typeof entry.updated_at === "string" ? entry.updated_at : null;
    const snapshot = entry.snapshot;

    if (
        !id ||
        !createdAt ||
        !updatedAt ||
        !snapshot ||
        typeof snapshot !== "object"
    ) {
        return null;
    }

    return {
        id,
        created_at: createdAt,
        updated_at: updatedAt,
        snapshot: snapshot as ProductSnapshot,
    };
};

const parseTimestamp = (value: string | null | undefined): number | null => {
    if (!value) {
        return null;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const formatVersionId = (productId: string, date: Date): string => {
    const timestamp = (
        date.getUTCFullYear().toString() +
        padNumber(date.getUTCMonth() + 1) +
        padNumber(date.getUTCDate()) +
        padNumber(date.getUTCHours()) +
        padNumber(date.getUTCMinutes()) +
        padNumber(date.getUTCSeconds())
    );
    return `${productId}_${timestamp}`;
};

const padNumber = (value: number): string => value.toString().padStart(2, "0");
