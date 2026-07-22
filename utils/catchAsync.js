// Wraps an async Express route handler so any thrown/rejected error
// is automatically forwarded to next(), instead of needing a manual
// try/catch in every controller.

export const catchAsync = (fn) => (req, res, next) => {

    Promise.resolve(fn(req, res, next)).catch(next);
    
};