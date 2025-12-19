export class AppError extends Error {
    public readonly status: number;
    public readonly details?: unknown;

    constructor(message: string, status = 500, details?: unknown) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad request", details?: unknown) {
        super(message, 400, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized", details?: unknown) {
        super(message, 401, details);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden", details?: unknown) {
        super(message, 403, details);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found", details?: unknown) {
        super(message, 404, details);
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict", details?: unknown) {
        super(message, 409, details);
    }
}

export class ConfigurationError extends AppError {
    constructor(message = "Missing or invalid configuration", details?: unknown) {
        super(message, 500, details);
    }
}

export class DatabaseError extends AppError {
    constructor(message = "Database error", details?: unknown) {
        super(message, 500, details);
    }
}
