import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

export type ProductCategory =
    | "REGULAR"
    | "BUNDLE"
    | "CAMP"
    | "PRIVATE"
    | "GROUP"
    | "GROUP_RENTAL";

export type ProductRecord = {
    id: string;
    name: string;
    description: string | null;
    category: ProductCategory;
    variations: JsonValue | null;
    variants: JsonValue | null;
    versions: JsonValue | null;
    last_saved_at: string | null;
    is_open: boolean;
    is_active: boolean;
    valid_from: string | null;
    valid_to: string | null;
    created_at: string;
    updated_at: string;
};

export type ProductSummaryRecord = Pick<ProductRecord, "id" | "name" | "category">;

export const getProductById = async (
    productId: string
): Promise<ProductRecord | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("products")
        .select(
            [
                "id",
                "name",
                "description",
                "category",
                "variations",
                "variants",
                "versions",
                "is_open",
                "is_active",
                "valid_from",
                "valid_to",
                "created_at",
                "updated_at",
                "last_saved_at",
            ].join(",")
        )
        .eq("id", productId)
        .returns<ProductRecord>()
        .maybeSingle();

    if (error) {
        throw new DatabaseError("Failed to load product", error);
    }

    return data ?? null;
};

export const listProductsByIds = async (
    ids: string[]
): Promise<ProductSummaryRecord[]> => {
    if (!ids.length) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("products")
        .select(["id", "name", "category"].join(","))
        .in("id", ids)
        .returns<ProductSummaryRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to list products", error);
    }

    return data ?? [];
};

export const saveProductVersions = async (
    productId: string,
    versions: JsonValue | null,
): Promise<void> => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from("products")
        .update({ versions })
        .eq("id", productId);

    if (error) {
        throw new DatabaseError("Failed to update product versions", error);
    }
};
