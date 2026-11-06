// Errors with a `status` are turned into JSON responses by middleware/errorHandler.js.
export const httpError = (status, message) => Object.assign(new Error(message), { status });
export const badRequest = (message) => httpError(400, message);
export const notFound = (message) => httpError(404, message);
