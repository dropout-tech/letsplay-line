import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type OrderStatus =
    | "PENDING_PAYMENT"
    | "PAID"
    | "CANCELLED"
    | "REFUNDED";

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

export type OrderRecord = {
    id: string;
    user_id: string;
    student_id: string;
    order_items: JsonValue;
    total_amount: number;
    discount_id: string | null;
    discount_amount: number;
    final_price: number;
    status: OrderStatus;
    paid_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type CreateOrderInput = {
    user_id: string;
    student_id: string;
    order_items: JsonValue;
    total_amount: number;
    discount_amount: number;
    final_price: number;
    status: OrderStatus;
    notes?: string | null;
};

const TABLE = "orders";
const ORDER_COLUMNS = [
    "id",
    "user_id",
    "student_id",
    "order_items",
    "total_amount",
    "discount_id",
    "discount_amount",
    "final_price",
    "status",
    "paid_at",
    "notes",
    "created_at",
    "updated_at",
] as const;
const ORDER_SELECT = ORDER_COLUMNS.join(",");

export type ListOrdersFilters = {
    status?: OrderStatus;
};

export type UpdateOrderStatusInput = {
    status: OrderStatus;
    paid_at?: string | null;
    notes?: string | null;
};

export const createOrder = async (
    input: CreateOrderInput
): Promise<OrderRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert({
            user_id: input.user_id,
            student_id: input.student_id,
            order_items: input.order_items,
            total_amount: input.total_amount,
            discount_amount: input.discount_amount,
            final_price: input.final_price,
            status: input.status,
            notes: input.notes ?? null,
        })
        .select(ORDER_SELECT)
        .returns<OrderRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to create order", error);
    }

    return data;
};

export const listOrders = async (
    filters: ListOrdersFilters = {}
): Promise<OrderRecord[]> => {
    const supabase = getSupabaseClient();
    let query = supabase
        .from(TABLE)
        .select(ORDER_SELECT)
        .order("updated_at", { ascending: false });

    if (filters.status) {
        query = query.eq("status", filters.status);
    }

    const { data, error } = await query.returns<OrderRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to fetch orders", error);
    }

    return data ?? [];
};

export const getOrderById = async (
    orderId: string
): Promise<OrderRecord | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(ORDER_SELECT)
        .eq("id", orderId)
        .returns<OrderRecord>()
        .maybeSingle();

    if (error) {
        throw new DatabaseError("Failed to fetch order", error);
    }

    return data ?? null;
};

export const updateOrderStatus = async (
    orderId: string,
    input: UpdateOrderStatusInput
): Promise<OrderRecord> => {
    const supabase = getSupabaseClient();

    const payload: Record<string, unknown> = {
        status: input.status,
    };

    if (Object.prototype.hasOwnProperty.call(input, "paid_at")) {
        payload.paid_at = input.paid_at ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(input, "notes")) {
        payload.notes = input.notes ?? null;
    }

    const { data, error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq("id", orderId)
        .select(ORDER_SELECT)
        .returns<OrderRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to update order", error);
    }

    return data;
};

export type UpdateOrderFulfillmentInput = {
    order_items: JsonValue;
    status: OrderStatus;
    paid_at: string;
    notes?: string | null;
};

export const updateOrderFulfillment = async (
    orderId: string,
    input: UpdateOrderFulfillmentInput
): Promise<OrderRecord> => {
    const supabase = getSupabaseClient();

    const payload: Record<string, unknown> = {
        status: input.status,
        order_items: input.order_items,
        paid_at: input.paid_at,
    };

    if (Object.prototype.hasOwnProperty.call(input, "notes")) {
        payload.notes = input.notes ?? null;
    }

    const { data, error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq("id", orderId)
        .select(ORDER_SELECT)
        .returns<OrderRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to finalize order", error);
    }

    return data;
};
