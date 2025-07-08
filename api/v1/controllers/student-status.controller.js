import logger from "../../../config/logger.js";
import { sendApiError, sendApiResponse } from "../helpers/api.helper.js";
import {
  checkIfStudentHasAnOngoingRequest,
  findStudentWithOrgCodeAndStudentId,
  fetchListOfBranchesUnderOrgUsingOrgShortCode,
} from "../services/auth.query.js";

// Step 5.1: Implement New GET Endpoint
export const checkStudentStatusController = async (req, res) => {
  const orgCode = req.query.orgCode;
  const studentId = req.query.studentId;

  logger.info({ orgCode, studentId }, "checkStudentStatusController called");

  // Step 6.2: Add Request Validation
  if (!orgCode || !studentId) {
    return sendApiError(
      res,
      "orgCode and studentId are required parameters",
      400
    );
  }

  try {
    // Step 5.2: Use exact same functions as OTP verification
    const ongoingRequestDetails = await checkIfStudentHasAnOngoingRequest(
      studentId,
      orgCode
    );
    const studentDetails = await findStudentWithOrgCodeAndStudentId(
      orgCode,
      studentId
    );
    const orgBranchDetails = await fetchListOfBranchesUnderOrgUsingOrgShortCode(
      orgCode
    );

    // Check if student exists
    if (!studentDetails || studentDetails.length === 0) {
      return sendApiError(
        res,
        "Student not found with provided orgCode and studentId",
        404
      );
    }

    // Parse field statuses from diffDetails if available
    let fieldStatuses = {};
    if (
      ongoingRequestDetails &&
      ongoingRequestDetails.length > 0 &&
      ongoingRequestDetails[0].diffDetails
    ) {
      try {
        const diffDetailsArray = JSON.parse(
          `[${ongoingRequestDetails[0].diffDetails}]`
        );
        diffDetailsArray.forEach((detail) => {
          if (detail.fieldName) {
            fieldStatuses[detail.fieldName] = detail.fieldStatus || "pending";
          }
        });
      } catch (parseError) {
        logger.error(
          parseError,
          "Error parsing diffDetails from ongoing request"
        );
      }
    }

    // Format response - same structure as OTP verification returns
    const responseData = {
      hasRequests: ongoingRequestDetails && ongoingRequestDetails.length > 0,
      overallStatus:
        ongoingRequestDetails && ongoingRequestDetails.length > 0
          ? ongoingRequestDetails[0].status
          : "no_requests",
      fieldStatuses,
      studentDetails: studentDetails[0], // Use the first result as it should be unique
      orgBranchDetails,
      ongoingRequestDetails, // Include the raw request details same as OTP verification
      // Additional metadata for convenience
      metadata: {
        totalRequests: ongoingRequestDetails ? ongoingRequestDetails.length : 0,
        lastUpdated:
          ongoingRequestDetails && ongoingRequestDetails.length > 0
            ? ongoingRequestDetails[0].requestCreatedAt
            : null,
        orgCode,
        studentId,
      },
    };

    logger.info(
      `Student status retrieved for ${studentId} in org ${orgCode}: ${responseData.overallStatus}`
    );

    return sendApiResponse(res, responseData);
  } catch (err) {
    logger.error(
      err,
      `Error in checkStudentStatusController for student ${studentId} in org ${orgCode}`
    );
    return sendApiError(
      res,
      "Something went wrong while checking student status. Please try again.",
      500
    );
  }
};
