// auth.controller.js
import {
  addRefreshToken,
  checkIfStudentHasAnOngoingRequest,
  checkIfUserAlreadyExists,
  fetchAvailableRoadmapsForUser,
  fetchCoachPassword,
  fetchListOfBranchesUnderOrgUsingOrgShortCode,
  fetchOrgIdUsingOrgCode,
  fetchSecret,
  fetchStudentDetails,
  fetchStudentInfo,
  fetchUserEnrolledRoadmaps,
  fetchUserPassword,
  findOrgCode,
  findStudentWithOrgCodeAndStudentId,
  findUserWithOrgCodeAndStudentId,
  generateNewUserRequest,
  insertIntoUserRaisedRequestDetails,
  retrieveRefreshTokenGeneratedForUserByPlatform,
  validateOtp,
} from "../services/auth.query.js";
import {
  generateTempStudentToken,
  createTempStudentTokensTable,
} from "../services/temp-student-token.service.js";
import { enhancedApiResponse } from "../helpers/response-header.helper.js";
import logger from "../../../config/logger.js";
import {
  generateAuthToken,
  generateAuthTokenForAdminAccess,
  generateAuthTokenForCoachAccess,
  generateRefreshToken,
  sendApiError,
  sendApiResponse,
  verifyRefreshToken,
} from "../helpers/api.helper.js";
import {
  createUserAndOnboard,
  generateAndTriggerOtpToRegisteredMobileNumber,
} from "../services/auth.service.js";
import { verifyPassword } from "../helpers/crypt.helper.js";
import bluebird from "bluebird";
const { Promise } = bluebird.Promise;

// // controller to create the user -> generate the OTP
// export const createUserWithMagicLinkAndGenerateOtp = async (req, res) => {
//   const studentUniqueId = req.body.studentId;

//   if (!studentUniqueId) {
//     res.json({
//       message: "failure",
//       error: "No Student Information Found. Please retry again",
//     });
//   }

//   const studentId = String(studentUniqueId).split("-")[1];
//   try {
//     const dbResult = await fetchStudentInfo(studentId);
//     logger.info(dbResult, "the databaseResult");

//     if (dbResult?.studentId) {
//       return createUserAndOnboard({
//         studentUniqueId,
//         studentId: dbResult?.studentId,
//         orgCode: dbResult.orgCode,
//         name: dbResult?.name,
//         email: dbResult?.email,
//         phone: dbResult?.phone,
//         alternatePhone: dbResult?.alternatePhone || null,
//         dob: dbResult?.dob,
//       }).then(() => {
//         return res.json({
//           message: "success",
//           result: dbResult,
//         });
//       });
//     }
//   } catch (err) {
//     logger.error(err, " here is the error");
//     return res.json({
//       message: "failure",
//       error: "Error in fetching Student Information. Please retry again",
//     });
//   }
// };

export const verifyOrgCodeController = async (req, res) => {
  const orgCode = req.query.orgCode;

  logger.info({ orgCode }, "orgCode from payload [verifyOrgCodeController]");

  try {
    const dbResult = await findOrgCode(orgCode);
    logger.info(
      dbResult,
      "the databaseResult for verifyOrgCode [verifyOrgCodeController]"
    );

    if (dbResult.length) {
      return sendApiResponse(res, dbResult[0], 200);
    }
    throw new Error("Organization Not Found");
  } catch (err) {
    logger.error(
      err,
      "Error in finding the Org Code  [verifyOrgCodeController]"
    );
    return sendApiError(
      res,
      "Invalid Org Code. Please enter a valid input.",
      200
    );
  }
};

export const loginController = async (req, res) => {
  const orgCode = req.body.orgCode;
  const studentId = req.body.studentId;
  const platform = req.headers["platform"];

  //find the details in the users table
  // if the data is already present in the users table then trigger the OTP to the registered mobile number.
  // if the data is not present then check it in the student_info table and return it as a new user with the student information.
  // if the data is not present then return an error message

  try {
    const userResult = await findUserWithOrgCodeAndStudentId(
      orgCode,
      studentId
    );

    if (userResult?.length) {
      //call the otp service
      const { userId, userPhone } = userResult[0];
      const otpResult = await generateAndTriggerOtpToRegisteredMobileNumber(
        userId,
        platform,
        userPhone,
        "login"
      );
      const maskedPhone = `xxxxxxxx${String(userPhone).slice(-2)}`;
      logger.debug(otpResult, "the OTP is here");
      const userResponse = {
        notifyUser:
          "We have Successfully sent OTP to the registered mobile number!",
        otpId: otpResult?.otpId,
        maskedPhone,
      };
      if (process.env.NODE_ENV === "development") {
        userResponse.generatedOtp = otpResult.generatedOtp;
      }
      return sendApiResponse(res, userResponse);
    } else {
      const studentResult = await findStudentWithOrgCodeAndStudentId(
        orgCode,
        studentId
      );

      if (studentResult?.length) {
        const { phone } = studentResult[0];
        const otpResult = await generateAndTriggerOtpToRegisteredMobileNumber(
          null,
          platform,
          phone,
          "register"
        );
        const maskedPhone = `xxxxxxxx${String(phone).slice(-2)}`;
        logger.debug(otpResult, "the OTP is here");
        const userResponse = {
          notifyUser:
            "We have Successfully sent OTP to the registered mobile number!",
          otpId: otpResult?.otpId,
          maskedPhone,
        };
        if (process.env.NODE_ENV === "development") {
          userResponse.generatedOtp = otpResult.generatedOtp;
        }
        return sendApiResponse(res, userResponse);
      } else {
        return sendApiError(
          res,
          "Opps! We have not found your details. Please try again!"
        );
      }
    }
  } catch (err) {
    logger.error(err, "Error in finding the user [loginController]");
    return sendApiError(
      res,
      "Something went wrong in processing the request",
      200
    );
  }
};

export const registerNewUserController = async (req, res) => {
  const orgCode = req.body.orgCode;
  const studentId = req.body.studentId;
  const platform = req.headers["platform"];

  // fetch the student details and create the user and also genearte a user_hash that can be used for magic_links
  try {
    const userResult = await checkIfUserAlreadyExists(orgCode, studentId);
    if (userResult?.length && userResult[0].userId) {
      return sendApiError(res, {
        notifyUser: "User Already Exists! Please login",
        action: "login",
      });
    }
    const studentDetails = await fetchStudentDetails(orgCode, studentId);
    const ongoingRequestCheck = await checkIfStudentHasAnOngoingRequest(
      studentId,
      studentDetails[0]?.orgId
    );
    if (
      ongoingRequestCheck?.length &&
      ongoingRequestCheck[0]?.status === "pending"
    ) {
      return sendApiError(
        res,
        {
          notifyUser:
            "Already a request is in progress. Please wait until it to be closed.",
        },
        200
      );
    }
    if (studentDetails[0]?.studentDbId) {
      const userResult = await createUserAndOnboard({
        studentUniqueId: `${studentDetails[0]?.orgCode}-${studentId}`,
        studentId: studentDetails[0]?.studentDbId,
        orgCode: studentDetails[0]?.orgCode,
        orgId: studentDetails[0]?.orgId,
        name: studentDetails[0]?.name,
        email: studentDetails[0]?.email,
        phone: studentDetails[0]?.phone,
        alternatePhone: studentDetails[0]?.alternatePhone || null,
        dob: studentDetails[0]?.dob,
        gender: studentDetails[0]?.gender,
      });

      if (userResult?.userId) {
        //create the token and send the token back
        const tokenPayload = {
          userId: userResult.userId,
          role: "USER",
          platform,
        };
        const isUserEnrolledToRoadmap = await fetchUserEnrolledRoadmaps(
          userResult.userId
        );

        const availableRoadmaps = await fetchAvailableRoadmapsForUser(
          userResult.userId
        );
        logger.debug(
          isUserEnrolledToRoadmap,
          `data being received: [verifyUserOtpController/isUserEnrolledToRoadmap]`
        );

        let data = { availableRoadmaps };
        if (isUserEnrolledToRoadmap?.length) {
          data = {
            ...data,
            isUserEnrolledToRoadmap: true,
            enrolledRoadmaps: isUserEnrolledToRoadmap,
          };
        } else {
          data = {
            ...data,
            isUserEnrolledToRoadmap: false,
            enrolledRoadmaps: [],
          };
        }
        const authToken = generateAuthToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        await addRefreshToken(userResult.userId, refreshToken, platform);
        res.set("Authorization", authToken);
        res.set("x-refresh-token", refreshToken);
        return sendApiResponse(
          res,
          {
            notifyUser: "Successfully registered!",
            data,
          },
          200
        );
      }
      throw new Error("Something went wrong in creating a new user");
    }
    throw new Error("Something went wrong in creating a new user");
  } catch (err) {
    logger.error(err, "Error in finding the user[registerNewUserController]");
    return sendApiError(
      res,
      "Something went wrong in processing the request",
      200
    );
  }
};

export const verifyUserOtpController = async (req, res) => {
  const otpId = req.body.otpId;
  const otp = req.body.otp;
  const platform = req.headers["platform"];
  const orgCode = req.body.orgCode;
  const studentId = req.body.studentId;

  try {
    const userOtpResult = await validateOtp(otpId, otp, platform);

    if (userOtpResult?.length && userOtpResult[0].type === "login") {
      const userId = userOtpResult[0].userId;
      const tokenPayload = {
        userId,
        role: "USER",
        platform,
      };

      const isUserEnrolledToRoadmap = await fetchUserEnrolledRoadmaps(userId);
      const availableRoadmaps = await fetchAvailableRoadmapsForUser(userId);
      logger.debug(
        isUserEnrolledToRoadmap,
        availableRoadmaps,
        `data being received: [verifyUserOtpController/isUserEnrolledToRoadmap]`
      );

      let data = { availableRoadmaps };
      if (isUserEnrolledToRoadmap?.length) {
        data = {
          ...data,
          isUserEnrolledToRoadmap: true,
          enrolledRoadmaps: isUserEnrolledToRoadmap,
        };
      } else {
        data = {
          ...data,
          isUserEnrolledToRoadmap: false,
          enrolledRoadmaps: [],
        };
      }
      const authToken = generateAuthToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      await addRefreshToken(userOtpResult[0].userId, refreshToken, platform);
      res.set("Authorization", authToken);
      res.set("x-refresh-token", refreshToken);
      return sendApiResponse(res, { data }, 200);
    } else if (userOtpResult?.length && userOtpResult[0].type === "register") {
      const studentResult = await findStudentWithOrgCodeAndStudentId(
        orgCode,
        studentId
      );

      const orgBranchDetails =
        await fetchListOfBranchesUnderOrgUsingOrgShortCode(orgCode);
      const ongoingRequestDetails = await checkIfStudentHasAnOngoingRequest(
        studentId,
        orgCode
      );

      if (studentResult?.length) {
        // Step 4.1: Generate temp student token for non-registered students
        try {
          const tempTokenResult = await generateTempStudentToken(
            orgCode,
            studentId
          );

          // Step 4.1: Set x-temp-student-token header and include session data
          const responseData = {
            isNewUser: true,
            studentDetails: studentResult[0],
            ongoingRequestDetails,
            orgBranchDetails,
            startDateLimits: [{}],
            // Include session data for restoration
            sessionData: {
              orgCode,
              studentId,
              tempToken: tempTokenResult.token,
            },
          };

          const tokenData = {
            type: "temp_student",
            tempToken: tempTokenResult.token,
          };

          return enhancedApiResponse(res, responseData, 200, tokenData);
        } catch (tokenError) {
          logger.error(
            tokenError,
            "Error generating temp token, falling back to regular response"
          );
          // Fallback to existing behavior if token generation fails
          return sendApiResponse(res, {
            isNewUser: true,
            studentDetails: studentResult[0],
            ongoingRequestDetails,
            orgBranchDetails,
            startDateLimits: [{}],
          });
        }
      }
    }
    return sendApiError(res, "Invalid OTP!");
  } catch (err) {
    logger.error(err, "Error in verifying user otp [verifyUserOtpController]");
    return sendApiError(
      res,
      "Something went wrong in processing the request. Please retry",
      200
    );
  }
};

export const validateRefreshTokenAndGenerateNewAuthToken = async (req, res) => {
  const refreshToken = req.headers["x-refresh-token"];
  const platform = req.headers["platform"];

  try {
    const tokenPayload = await verifyRefreshToken(refreshToken);
    logger.info(tokenPayload, "the validated token payload is");
    if (
      tokenPayload?.isValid &&
      platform === tokenPayload?.data?.platform &&
      tokenPayload?.data?.userId
    ) {
      const userGeneratedTokensBasedOnPlatform =
        await retrieveRefreshTokenGeneratedForUserByPlatform(
          tokenPayload?.data?.userId,
          refreshToken,
          platform
        );
      logger.debug(
        userGeneratedTokensBasedOnPlatform,
        `data being received: [validateRefreshTokenAndGenerateNewAuthToken]`
      );
      if (userGeneratedTokensBasedOnPlatform?.length) {
        if (
          refreshToken === userGeneratedTokensBasedOnPlatform[0]?.refreshToken
        ) {
          const newTokenPayload = {
            userId: tokenPayload?.data?.userId,
            role: "USER",
            platform,
          };
          const authToken = generateAuthToken(newTokenPayload);
          res.set("Authorization", authToken);
          return sendApiResponse(res, null, 200);
        }
        throw "Token not found in our DB!";
      }
      throw "Token not found in our DB!";
    }
    throw new Error("Token is not valid");
  } catch (err) {
    logger.error(err, "Error in validating refresh token");
    return sendApiError(
      res,
      "Invalid token! Please try with a valid token",
      500
    );
  }
};

export const resendOtpController = async (req, res) => {
  const orgCode = req.body.orgCode;
  const studentId = req.body.studentId;
  const platform = req.headers["platform"];

  try {
    const userResult = await findUserWithOrgCodeAndStudentId(
      orgCode,
      studentId
    );

    if (userResult?.length) {
      //call the otp service
      const { userId, userPhone } = userResult[0];
      const otpResult = await generateAndTriggerOtpToRegisteredMobileNumber(
        userId,
        platform,
        userPhone,
        "login"
      );
      logger.debug(otpResult, "the OTP is here");
      const userResponse = {
        notifyUser:
          "We have Successfully sent OTP to the registered mobile number!",
        otpId: otpResult?.otpId,
      };
      if (process.env.NODE_ENV === "development") {
        userResponse.generatedOtp = otpResult.generatedOtp;
      }
      return sendApiResponse(res, userResponse);
    } else {
      const studentResult = await findStudentWithOrgCodeAndStudentId(
        orgCode,
        studentId
      );

      if (studentResult?.length) {
        const { phone } = studentResult[0];
        const otpResult = await generateAndTriggerOtpToRegisteredMobileNumber(
          null,
          platform,
          phone,
          "register"
        );
        logger.debug(otpResult, "the OTP is here");
        const userResponse = {
          notifyUser:
            "We have Successfully sent OTP to the registered mobile number!",
          otpId: otpResult?.otpId,
        };
        if (process.env.NODE_ENV === "development") {
          userResponse.generatedOtp = otpResult.generatedOtp;
        }
        return sendApiResponse(res, userResponse);
      } else {
        return sendApiError(res, "Invalid request! No user found");
      }
    }
  } catch (err) {
    logger.error(err, "Error in resending OTP");
    return sendApiError(res, "Error in resending OTP. Please try again", 500);
  }
};

export const adminLoginController = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  logger.debug(email, password, `data being received:  [adminLoginController]`);
  try {
    const userPasswordRegistered = await fetchUserPassword(email);

    if (userPasswordRegistered?.length) {
      const secret = await fetchSecret("admin_login");
      logger.debug(secret, `data being received: [fetchSecret]`);

      if (secret?.length) {
        const passwordMatched = await verifyPassword(
          email,
          password,
          secret[0]?.secretKey,
          secret[0]?.iv,
          userPasswordRegistered[0]?.password
        );
        logger.debug(passwordMatched, `data being received: [verifyPassword]`);
        if (passwordMatched === true) {
          const tokenPayload = {
            userId: userPasswordRegistered[0].id,
            ROLE: "ADMIN",
            platform: "NETWORK",
          };
          const authToken = generateAuthTokenForAdminAccess(tokenPayload);
          res.set("Authorization", authToken);
          return sendApiResponse(res, null, 200);
        } else {
          throw "Invalid Credentials";
        }
      }
      throw "Invalid Credentials";
    }
    throw "Invalid Credentials";
  } catch (err) {
    logger.error(err, "error while admin logging in [adminLoginController]");
    return sendApiError(
      res,
      err ?? "Something went wrong! Please try again",
      500
    );
  }
};

export const raiseStudentInfoRequest = async (req, res) => {
  const orgCode = req.body.orgCode;
  const studentId = req.body.studentId;
  const dataToUpdate = req.body.dataToUpdate;

  try {
    const ongoingRequestCheck = await checkIfStudentHasAnOngoingRequest(
      studentId,
      orgCode
    );
    logger.debug(
      ongoingRequestCheck,
      `data being received: [raiseStudentInfoRequest/ongoingRequestCheck]`
    );
    if (
      ongoingRequestCheck?.length &&
      ongoingRequestCheck[0]?.status === "pending"
    ) {
      return sendApiError(
        res,
        {
          notifyUser:
            "Already a request is in progress. Please wait until it to be closed.",
          data: ongoingRequestCheck[0],
        },
        200
      );
    } else {
      const newRequestId = await generateNewUserRequest(studentId);
      logger.debug(
        newRequestId,
        dataToUpdate,
        `data being received: [generateNewUserRequest/result]`
      );
      if (newRequestId) {
        await Promise.map(dataToUpdate, async (data) => {
          const { fieldName, oldValue, newValue } = data;
          await insertIntoUserRaisedRequestDetails(
            newRequestId,
            fieldName,
            oldValue,
            newValue
          );
        });
        return sendApiResponse(res, {
          notifyUser: "You have successfully raised a request.",
          newRequestId,
        });
      } else {
        return sendApiError(
          res,
          {
            notifyUser:
              "Something went wrong in raising a new request. Please try again after sometime!",
          },
          200
        );
      }
    }
  } catch (err) {}
};

export const coachLoginController = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  logger.debug(email, password, `data being received:  [coachLoginController]`);
  try {
    const userPasswordRegistered = await fetchCoachPassword(email);

    if (userPasswordRegistered?.length) {
      const secret = await fetchSecret("coach_login");
      logger.debug(secret, `data being received: [fetchSecret]`);

      if (secret?.length) {
        const passwordMatched = await verifyPassword(
          email,
          password,
          secret[0]?.secretKey,
          secret[0]?.iv,
          userPasswordRegistered[0]?.password
        );
        logger.debug(passwordMatched, `data being received: [verifyPassword]`);
        if (passwordMatched === true) {
          const tokenPayload = {
            userId: userPasswordRegistered[0].id,
            ROLE: "COACH",
            platform: "COACH_DASHBOARD",
          };
          const authToken = generateAuthTokenForCoachAccess(tokenPayload);
          res.set("Authorization", authToken);
          return sendApiResponse(res, null, 200);
        } else {
          throw "Invalid Credentials";
        }
      }
      throw "Invalid Credentials";
    }
    throw "Invalid Credentials";
  } catch (err) {
    logger.error(err, "error while admin logging in [adminLoginController]");
    return sendApiError(
      res,
      err ?? "Something went wrong! Please try again",
      500
    );
  }
};
