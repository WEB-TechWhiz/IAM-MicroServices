import { ApiError } from '../utility/ApiError.js';

// Middleware to authorize based on allowed roles
export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user and role exist
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, "Unauthorized: user not authenticated or role missing"));
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: You do not have permission to access this resource"));
    }

    // If role is authorized, proceed
    next();
  };
};
