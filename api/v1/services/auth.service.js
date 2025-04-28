import logger from "../../../config/logger.js";
import {
  generateOtpDigits,
  generateUniqueHash,
} from "../helpers/api.helper.js";
import {
  insertUserToUsersTable,
  storeGeneratedOtpForUser,
  storeMagicLink,
  updateHashId,
} from "./auth.query.js";

export const createUserAndOnboard = async ({
  studentUniqueId,
  studentId,
  orgCode,
  orgId,
  name,
  phone,
  alternatePhone,
  dob,
  gender,
  email,
}) => {
  if (
    !studentUniqueId ||
    !studentId ||
    !orgCode ||
    !orgId ||
    !name ||
    !phone ||
    !dob ||
    !email ||
    !gender
  ) {
    throw new Error("All parameters are required.");
  }

  logger.info(
    studentUniqueId,
    studentId,
    orgCode,
    orgId,
    name,
    phone,
    alternatePhone,
    dob,
    gender,
    email,
    "[createUserAndOnboard]"
  );

  try {
    const dbResult = await insertUserToUsersTable({
      uniqueId: studentUniqueId,
      studentId,
      orgId,
      name,
      dob,
      gender,
      phone,
      alternatePhone,
      email,
      isEnrolled: 1,
      isVerified: 1,
    });
    logger.info(dbResult, "User  created successfully in the database");

    if (dbResult?.insertId) {
      const userHashResponse = await generateMagicLink({
        studentId,
        userId: dbResult?.insertId,
      });
      logger.info(userHashResponse, "the userHashResponse");
      return Promise.resolve({
        userId: dbResult?.insertId,
      });
    }
    return {
      message: "success",
      result: dbResult,
    };
  } catch (err) {
    logger.error(err, "Error in creating user in the database");
    throw new Error("Error in creating user. Please retry again.");
  }
};

export const generateMagicLink = async ({ studentId, userId }) => {
  if (!studentId || !userId) {
    throw new Error(
      "Required Information is not present to generate the magic link"
    );
  }

  try {
    const hashGenerated = generateUniqueHash(30, "hex");
    const magicLink = `https://talent-gig.com/magic-login?hash=${hashGenerated}`;

    const dbResult = await storeMagicLink({
      hashGenerated,
      studentId,
      userId,
      magicLink,
    });

    logger.info(dbResult, "Magic link generated and stored successfully");

    if (dbResult?.insertId) {
      const result = await updateHashId({
        hashId: dbResult?.insertId,
        studentId,
        userId,
      });

      logger.debug(result, `data being received: [updateHashId/result]`);

      if (result) {
        return {
          message: "success",
          result: {
            hashId: dbResult.insertId,
          },
        };
      }
    }
  } catch (err) {
    logger.error(err, "Error in generating magic link");
    throw err;
  }
};

export const generateAndTriggerOtpToRegisteredMobileNumber = async (
  userId,
  platform,
  phone,
  type
) => {
  const otp = generateOtpDigits();

  try {
    // await triggerOtpToRegisteredMobileNumber(otp, userDetails);
    const result = await storeGeneratedOtpForUser(
      otp,
      userId,
      platform,
      phone,
      type
    );
    return {
      generatedOtp: otp,
      otpId: result.insertId,
    };
  } catch (err) {
    logger.error(err, "Error in generating and triggering OTP");
    throw err;
  }
};
