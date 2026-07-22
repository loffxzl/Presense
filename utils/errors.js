// utils/errors.js
import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found'){
        super(message,404);
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Inavalid input'){
        super(message,400)
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Not authorized'){
        super(message, 401);
    }
}