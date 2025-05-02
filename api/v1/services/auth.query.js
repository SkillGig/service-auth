import bluebird from "bluebird";
const { Promise } = bluebird;
import { query } from "../../../config/db.js";
import logger from "../../../config/logger.js";

export const fetchStudentInfo = async (studentUniqueId) => {
  logger.debug(`StudentId: ${studentUniqueId}  [fetchStudentInfo]`);

  const unqiueIds = String(studentUniqueId).split("-");
  const orgShortCode = unqiueIds[0];
  const studentId = unqiueIds[1];
  try {
    const [userResult] = await findUserUsingStudentUniqueId(studentUniqueId);
    if (userResult) {
      throw new Error(
        `The student uniqueId is not found. Please try with a valid id`
      );
    }

    const [orgResult] = await fetchOrgIdUsingOrgCode(orgShortCode);
    if (!orgResult) {
      throw new Error(`The Org is not registered`);
    }

    const queryString = `SELECT id as studentId,
        org_code as orgCode,
        name,
        phone,
        alternate_phone as alternatePhone,
        DATE_FORMAT(dob, '%Y-%m-%d') as dob,
        email
    FROM student_info WHERE student_id = ?;`;
    const [result] = await query(queryString, [studentId]);
    return result;
  } catch (err) {
    logger.error(err, `Error fetching student info  [fetchStudentInfo]`);
    throw err;
  }
};

export const findUserUsingStudentUniqueId = async (studentUniqueId) => {
  const queryString = `SELECT id as userId FROM users WHERE unique_id = ?;`;

  try {
    const result = await query(queryString, [studentUniqueId]);
    return result;
  } catch (err) {
    logger.error(err, "[error] [findUserUsingStudentUniqueId]");
    throw err;
  }
};

export const insertUserToUsersTable = async ({
  uniqueId,
  studentId,
  orgId,
  name,
  phone,
  alternatePhone,
  dob,
  gender,
  email,
  isVerified,
  isEnrolled,
}) => {
  logger.debug(
    `User Details: ${uniqueId} ${studentId} ${orgId} ${name} ${gender} ${phone} ${alternatePhone} ${dob} ${email} [insertUserToUsersTable]`
  );
  const queryString = `INSERT INTO users (unique_id, student_id, org_id, name, phone, alternate_phone, dob, gender, email, is_verified, is_enrolled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
  const values = [
    uniqueId,
    studentId,
    orgId,
    name,
    phone,
    alternatePhone,
    dob,
    gender,
    email,
    isVerified,
    isEnrolled,
  ];
  try {
    const result = await query(queryString, values);
    logger.debug(result, "[result] [insertUserToUsersTable]");
    return result;
  } catch (err) {
    logger.error(err, `Error in creating the user  [insertUserToUsersTable]`);
    throw err;
  }
};

export const storeMagicLink = async ({
  hashGenerated,
  studentId,
  userId,
  magicLink,
}) => {
  const queryString = `INSERT INTO users_hash (hash_generated, student_id, user_id, magic_link)
        VALUES (?, ?, ?, ?);`;
  const values = [hashGenerated, studentId, userId, magicLink];
  try {
    const result = await query(queryString, values);
    return result;
  } catch (err) {
    logger.error(err, `Error in creating the user_hash [storeMagicLink]`);
    throw err;
  }
};

export const fetchOrgIdUsingOrgCode = async (orgCode) => {
  logger.debug(`OrgCode: ${orgCode} [fetchOrgIdUsingOrgCode]`);

  const queryString = `SELECT id AS orgId FROM organizations WHERE org_short_code = ?;`;
  try {
    const result = await query(queryString, [orgCode]);
    return result;
  } catch (err) {
    logger.error(err, `Error fetching orgId  [fetchOrgIdUsingOrgCod]`);
    throw err;
  }
};

export const updateHashId = async ({ hashId, studentId, userId }) => {
  logger.debug(
    `Details: hasId: ${hashId}, studentId: ${studentId}, userId: ${userId}  [updateHashId]`
  );

  const updateStudentTableQueryString = `UPDATE student_info SET user_id = ?, hash_id = ? WHERE student_id = ?;`;
  const updateStudentValues = [userId, hashId, studentId];
  const updateUserTableQueryString = `UPDATE users SET hash_id = ? WHERE id = ?;`;
  const updateUserValues = [hashId, userId];

  try {
    return Promise.all([
      query(updateStudentTableQueryString, updateStudentValues),
      query(updateUserTableQueryString, updateUserValues),
    ]);
  } catch (err) {
    logger.error(err, `Error in updating the user  [updateHashId]`);
    throw err;
  }
};

export const findEntryWithOrgShortCode = async (orgShortCode) => {
  logger.debug(`orgShortCode: ${orgShortCode}  [findEntryWithOrgShortCode]`);
  const queryString = `SELECT * FROM organisations WHERE org_id = ?;`;

  try {
    const result = await query(queryString, [orgShortCode]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in finding the Org entry  [findEntryWithOrgShort]`
    );
    throw err;
  }
};

export const findStudentInfoUsingStudentId = async (studentId) => {
  logger.debug(`studentId: ${studentId}  [findStudentInfoUsingStudentId]`);
  const queryString = `SELECT * FROM student_info WHERE student_id = ?;`;

  try {
    const result = await query(queryString, [studentId]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in finding the Student entry  [findStudentInfoUsingStudentId]`
    );
    throw err;
  }
};

export const findOrgCode = async (orgCode) => {
  logger.debug(`orgCode: ${orgCode}  [findOrgCode]`);
  const queryString = `SELECT id FROM organizations WHERE org_short_code = ?;`;

  try {
    const result = await query(queryString, [orgCode]);
    return result;
  } catch (err) {
    logger.error(err, `Error in finding the Org entry [findOrgCode]`);
    throw err;
  }
};

export const findUserWithOrgCodeAndStudentId = async (orgCode, studentId) => {
  logger.debug(
    `orgCode: ${orgCode}, studentId: ${studentId}  [findUserWithOrgCodeAndStudentId]`
  );

  const queryString = `SELECT u.id AS userId, u.phone AS userPhone FROM users u
    INNER JOIN organizations o ON u.org_id = o.id
    INNER JOIN student_info si ON u.student_id = si.id
    WHERE o.org_short_code = ? AND si.student_id = ?;`;

  try {
    const result = await query(queryString, [orgCode, studentId]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in finding the user entry , details: ${orgCode} ${studentId} [findUserWithOrgCodeAndStudentId]`
    );
    throw err;
  }
};

export const findStudentWithOrgCodeAndStudentId = async (
  orgCode,
  studentId
) => {
  logger.debug(
    `orgCode: ${orgCode}, studentId: ${studentId}  [findStudentWithOrgCodeAndStudentId]`
  );

  const queryString = `SELECT si.id AS studentOrgId,
    si.email AS email,
    si.phone AS phone,
    si.student_id as studentId,
    si.gender as gender,
    b.branch_code AS branchCode,
    b.branch_name AS branchName,
    o.id as organisationId,
    DATE_FORMAT(si.start_date, '%d-%m-%Y') AS startDate,
    DATE_FORMAT(si.end_date, '%d-%m-%Y') AS endDate
  FROM student_info si
      INNER JOIN organizations o ON si.org_code = o.org_short_code
      INNER JOIN org_branches b ON si.branch_id = b.id
  WHERE o.org_short_code = ?
  AND si.student_id = ?;`;

  try {
    const result = await query(queryString, [orgCode, studentId]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in finding the user entry , details: ${orgCode} ${studentId} [findStudentWithOrgCodeAndStudentId]`
    );
    throw err;
  }
};

export const storeGeneratedOtpForUser = async (
  otp,
  userId,
  platform,
  phone,
  type
) => {
  logger.debug(
    `otp: ${otp}, userId: ${userId}, platform: ${platform}  [storeGeneratedOtpForUser]`
  );

  const queryString = `INSERT INTO users_otp (user_id, otp_generated, platform, phone, type) VALUES (?, ?, ?, ?, ?);`;

  try {
    const result = await query(queryString, [
      userId,
      otp,
      platform,
      phone,
      type,
    ]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in storing the generated OTP , details: ${otp} ${userId} ${phone} ${type} [storeGeneratedOtpForUser]`
    );
    throw err;
  }
};

export const fetchStudentDetails = async (orgCode, studentId) => {
  logger.info(
    `orgCode: ${orgCode}, studentId: ${studentId}  [fetchStudentDetails]`
  );

  const queryString = `SELECT si.id as studentDbId,
    si.org_code                     as orgCode,
    si.name                         as name,
    si.phone                        as phone,
    si.alternate_phone              as alternatePhone,
    DATE_FORMAT(si.dob, '%Y-%m-%d') as dob,
    si.email                        as email,
    si.gender                       as gender,
    o.id                            as orgId,
    o.org_short_code                as orgCode
  FROM student_info si
      INNER JOIN organizations o ON si.org_code = o.org_short_code
  WHERE si.student_id = ?
  AND o.org_short_code = ?;`;

  try {
    const result = await query(queryString, [studentId, orgCode]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in fetching the student details , details: ${orgCode} ${studentId} [fetchStudentDetails]`
    );
    throw err;
  }
};

export const checkIfUserAlreadyExists = async (orgCode, studentId) => {
  logger.debug(
    `orgCode: ${orgCode}, studentId: ${studentId}  [checkIfUserAlreadyExists]`
  );

  const queryString = `SELECT u.id as userId
    FROM users u
            INNER JOIN student_info si ON u.student_id = si.id
            INNER JOIN organizations o ON si.org_code = o.org_short_code
    WHERE o.org_short_code = ?
      AND si.student_id = ?;`;

  try {
    const result = await query(queryString, [orgCode, studentId]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in checking if user already exists , details: ${orgCode}
      ${studentId} [checkIfUserAlreadyExists]`
    );
    throw err;
  }
};

export const validateOtp = async (otpId, otp, platform) => {
  logger.debug(
    `otpId: ${otpId}, otp: ${otp}, platform: ${platform}  [validateOtp]`
  );

  const queryString = `SELECT id, user_id as userId, phone, type
    FROM users_otp
    WHERE id = ?
    AND otp_generated = ?
    AND is_verified = 0
    AND platform = ?
    AND created_at >= NOW() - INTERVAL 15 MINUTE;`;

  try {
    const result = await query(queryString, [otpId, otp, platform]);
    if (result?.length) {
      const queryString = `UPDATE users_otp set is_verified = 1 WHERE id = ?`;
      await query(queryString, [result[0].id]);
      return result;
    }
    return [];
  } catch (err) {
    logger.error(err, `Error in validating OTP [validateOtp]`);
    throw err;
  }
};

export const addRefreshToken = async (userId, token, platform) => {
  logger.debug(`userId: ${userId}, token: ${token}  [addRefreshToken]`);
  const queryString = `INSERT INTO user_refresh_tokens (user_id, refresh_token, platform, is_valid, generated_at)
  VALUES (?, ?, ?, 1, NOW());`;

  try {
    const result = query(queryString, [userId, token, platform]);
    return result;
  } catch (err) {
    logger.error(err, `Error in adding refresh token [addRefreshToken]`);
    throw err;
  }
};

export const retrieveRefreshTokenGeneratedForUserByPlatform = async (
  userId,
  token,
  platform
) => {
  logger.debug(
    `userId: ${userId}, token: ${token}  [retrieveRefreshTokenGeneatedForUserByPlatform]`
  );

  const queryString = `SELECT id, refresh_token as refreshToken
    FROM user_refresh_tokens
    WHERE user_id = ?
      AND platform = ?
      AND is_valid = 1
    ORDER BY generated_at DESC LIMIT 1;`;
  try {
    const result = await query(queryString, [userId, platform, token]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `Error in retrieving refresh token generated for user and compare [retrieveRefreshTokenGeneratedForUserByPlatform]`
    );
    throw err;
  }
};

export const fetchSecret = async (type) => {
  logger.debug(type, "the data being passed into: [controllerName]");

  const queryString = `SELECT secret_key AS secretKey, iv
    FROM our_secrets
    WHERE secret_type = ?;`;

  try {
    const result = await query(queryString, [type]);
    return result;
  } catch (err) {
    logger.error(
      err,
      "Soemthing went wrong in run the query: [controllerName]"
    );
    return err;
  }
};

export const fetchUserPassword = async (email) => {
  logger.debug(email, `data being received: [fetchUserPassword]`);

  try {
    const queryString = `SELECT id, password FROM admin_users WHERE email = ?;`;
    const result = await query(queryString, [email]);
    return result;
  } catch (err) {
    logger.error(err, `error being received: [fetchUserPassword]`);
    return err;
  }
};

export const checkIfStudentHasAnOngoingRequest = async (studentId, orgId) => {
  logger.debug(
    studentId,
    orgId,
    `data being received: [checkIfStudentHasAnOngoingRequest]`
  );

  try {
    const queryString = `SELECT ur.id     as requestId,
    ur.status as status,
    GROUP_CONCAT(JSON_OBJECT('fieldName', urrd.field_name, 'oldValue', urrd.old_value, 'newValue', urrd.new_value,
                             'fieldStatus', urrd.status))
    FROM user_requests ur
          INNER JOIN student_info si ON ur.student_id = si.id
          INNER JOIN organizations o ON si.org_code = o.org_short_code
          INNER JOIN user_raised_request_details urrd ON ur.id = urrd.request_id
    WHERE si.student_id = ?
    AND ur.org_id = ?
    group by ur.id;`;
    const [result] = await query(queryString, [studentId, orgId]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `error being received: [checkIfStudentHasAnOngoingRequest]
    `
    );
    return err;
  }
};

export const generateNewUserRequest = async (studentId, orgId) => {
  logger.debug(
    studentId,
    orgId,
    `data being received: [generateNewUserRequest]`
  );

  try {
    const studentIdDetails = await fetchStudentIdUsingStudentOrgId(studentId);
    const queryString = `INSERT INTO user_requests (student_id, org_id) VALUES (?, ?);`;
    const result = await query(queryString, [
      studentIdDetails[0].studentId,
      orgId,
    ]);
    return result?.insertId ?? false;
  } catch (err) {
    logger.error(err, `error being received: [generateNewUserRequest]`);
    return err;
  }
};

export const fetchStudentIdUsingStudentOrgId = async (studentId) => {
  try {
    const queryString = `SELECT id AS studentId FROM student_info WHERE student_id = ?`;
    const result = await query(queryString, [studentId]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `error being received: [fetchStudentIdUsingStudentOrgId]`
    );
    return err;
  }
};

export const insertIntoUserRaisedRequestDetails = async (
  requestId,
  fieldName,
  oldName,
  newValue
) => {
  logger.debug(
    requestId,
    fieldName,
    oldName,
    newValue,
    `data being received: [insertIntoUserRaisedRequestDetails]`
  );
  try {
    const queryString = `INSERT INTO user_raised_request_details (request_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?);`;
    const result = await query(queryString, [
      requestId,
      fieldName,
      oldName,
      newValue,
    ]);
    return result;
  } catch (err) {
    logger.error(
      err,
      `error being received: [insertIntoUserRaisedRequestDetails]`
    );
    return err;
  }
};

export const fetchCoachPassword = async (email) => {
  logger.debug(email, `data being received: [fetchCoachPassword]`);

  try {
    const queryString = `SELECT id, password FROM coaches WHERE email = ?;`;
    const result = await query(queryString, [email]);
    return result;
  } catch (err) {
    logger.error(err, `error being received: [fetchCoachPassword]`);
    return err;
  }
};