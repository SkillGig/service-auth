import logger from "../../../config/logger.js";

// Step 3.1: Enhance Response Header Service
export const setTempStudentTokenHeader = (res, token) => {
  if (token) {
    res.set("x-temp-student-token", token);
    logger.debug("Set x-temp-student-token header");
  }
};

export const setAuthTokenHeaders = (res, authToken, refreshToken) => {
  if (authToken) {
    res.set("Authorization", authToken);
    logger.debug("Set Authorization header");
  }

  if (refreshToken) {
    res.set("x-refresh-token", refreshToken);
    logger.debug("Set x-refresh-token header");
  }
};

// Utility to set appropriate token headers based on user type
export const setTokenHeaders = (res, tokenData) => {
  const { type, authToken, refreshToken, tempToken } = tokenData;

  if (type === "temp_student") {
    setTempStudentTokenHeader(res, tempToken);
  } else if (type === "authenticated_user") {
    setAuthTokenHeaders(res, authToken, refreshToken);
  }

  logger.debug(`Set token headers for type: ${type}`);
};

// Support both temp tokens and existing auth tokens in responses
export const enhancedApiResponse = (
  res,
  data,
  statusCode = 200,
  tokenData = null
) => {
  if (tokenData) {
    setTokenHeaders(res, tokenData);
  }

  return res.status(statusCode).json({
    message: "success",
    data,
  });
};
