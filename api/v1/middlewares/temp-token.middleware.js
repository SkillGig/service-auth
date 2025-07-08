import logger from "../../../config/logger.js";
import { sendApiError } from "../helpers/api.helper.js";
import { validateTempStudentToken } from "../services/temp-student-token.service.js";

// Step 6.1: Implement Basic Token Security
export const tempTokenAuthMiddleware = async (req, res, next) => {
  try {
    const tempToken = req.headers["x-temp-student-token"];

    if (!tempToken) {
      return sendApiError(res, "Temp student token required", 401);
    }

    // Validate the temp token
    const validationResult = await validateTempStudentToken(tempToken);

    if (!validationResult.isValid) {
      return sendApiError(res, validationResult.error, 401);
    }

    // Add student info to request object for further use
    req.tempTokenData = {
      orgCode: validationResult.orgCode,
      studentId: validationResult.studentId,
      createdAt: validationResult.createdAt,
    };

    logger.debug(
      `Temp token validated for student ${validationResult.studentId} in org ${validationResult.orgCode}`
    );

    next();
  } catch (error) {
    logger.error(error, "Error in temp token authentication middleware");
    return sendApiError(res, "Token validation failed", 500);
  }
};

// Step 6.1: Validate temp token scope (students can only access their own data)
export const validateTempTokenScope = (req, res, next) => {
  try {
    const requestOrgCode = req.query.orgCode || req.body.orgCode;
    const requestStudentId = req.query.studentId || req.body.studentId;

    // Check if the temp token data matches the requested data
    if (
      req.tempTokenData?.orgCode !== requestOrgCode ||
      req.tempTokenData?.studentId !== requestStudentId
    ) {
      logger.warn(
        `Token scope violation: token for ${req.tempTokenData?.studentId}@${req.tempTokenData?.orgCode} trying to access ${requestStudentId}@${requestOrgCode}`
      );
      return sendApiError(res, "Access denied: Token scope mismatch", 403);
    }

    next();
  } catch (error) {
    logger.error(error, "Error in temp token scope validation");
    return sendApiError(res, "Scope validation failed", 500);
  }
};

// Optional middleware that accepts both temp tokens and regular auth tokens
export const flexibleAuthMiddleware = async (req, res, next) => {
  try {
    const tempToken = req.headers["x-temp-student-token"];
    const authToken = req.headers["authorization"];

    if (tempToken) {
      // Use temp token authentication
      return tempTokenAuthMiddleware(req, res, next);
    } else if (authToken) {
      // Use regular auth token authentication (delegate to existing auth middleware)
      // This would be implemented by the existing auth middleware
      next();
    } else {
      return sendApiError(res, "Authentication required", 401);
    }
  } catch (error) {
    logger.error(error, "Error in flexible auth middleware");
    return sendApiError(res, "Authentication failed", 500);
  }
};
