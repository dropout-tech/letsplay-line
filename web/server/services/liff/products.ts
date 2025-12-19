import { NotFoundError } from "@/server/errors";
import {
    getProductById,
    type JsonValue,
    type ProductCategory,
} from "@/server/repos/products-repo";

export type IncludeField = "variations" | "variants";

export type VariationOption = {
    value: string;
    label: string;
};

export type VariationConditionClause = {
    key: string;
    op: string;
    value: string;
};

export type VariationCondition = {
    all?: VariationConditionClause[];
};

export type VariationDefinition = {
    key: string;
    label: string;
    type: "single" | "multi";
    options: VariationOption[];
    condition?: VariationCondition;
};

export type VariantEnrollment = {
    class_id: string;
    credits: number;
};

export type VariantDefinition = {
    name: null;
    key: string;
    values: Record<string, string | string[]>;
    price: number;
    enrollments?: VariantEnrollment[];
};

export type LiffProductDetail = {
    id: string;
    name: string;
    category: ProductCategory;
    description: string | null;
    is_open: boolean;
    is_active: boolean;
    valid_from: string | null;
    valid_to: string | null;
    variations?: VariationDefinition[];
    variants?: VariantDefinition[];
};

export const DEFAULT_INCLUDE_FIELDS: ReadonlySet<IncludeField> = new Set([
    "variations",
    "variants",
]);

export const getLiffProductDetail = async (
    args: {
        productId: string;
        include?: ReadonlySet<IncludeField>;
        now?: Date;
    }
): Promise<LiffProductDetail> => {
    const { productId, include = DEFAULT_INCLUDE_FIELDS, now = new Date() } = args;

    const product = await getProductById(productId);
    if (!product || !product.is_active) {
        throw new NotFoundError("Product not found");
    }

    if (!isWithinAvailabilityWindow(product.valid_from, product.valid_to, now)) {
        throw new NotFoundError("Product is not currently available");
    }

    const response: LiffProductDetail = {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        is_open: product.is_open,
        is_active: product.is_active,
        valid_from: product.valid_from,
        valid_to: product.valid_to,
    };

    if (include.has("variations")) {
        response.variations = coerceJsonArray<VariationDefinition>(
            product.variations
        );
    }

    if (include.has("variants")) {
        response.variants = coerceJsonArray<VariantDefinition>(product.variants);
    }

    return response;
};

const coerceJsonArray = <T>(value: JsonValue | null): T[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value as unknown as T[];
};

const isWithinAvailabilityWindow = (
    validFrom: string | null,
    validTo: string | null,
    now: Date
): boolean => {
    if (validFrom) {
        const fromDate = new Date(validFrom);
        if (!isNaN(fromDate.getTime()) && now < fromDate) {
            return false;
        }
    }

    if (validTo) {
        const toDate = new Date(validTo);
        if (!isNaN(toDate.getTime()) && now > toDate) {
            return false;
        }
    }

    return true;
};
