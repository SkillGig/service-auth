import crypto from "crypto";
import { query } from "../../../config/db.js";
import logger from "../../../config/logger.js";
import { generateUniqueHash } from "../helpers/api.helper.js";

// Step 1.1: Create table function (to be run once)
export const createTempStudentTokensTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS temp_student_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      org_code VARCHAR(50) NOT NULL,
      student_id VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      INDEX idx_token_hash (token_hash),
      INDEX idx_org_student (org_code, student_id)
    ) ENGINE=InnoDB;
  `;

  try {
    const result = await query(createTableQuery);
    logger.info("Temp student tokens table created successfully");
    return result;
  } catch (err) {
    logger.error(err, "Error creating temp_student_tokens table");
    throw err;
  }
};

// Step 2.1: Token Generation Service
export const generateTempStudentToken = async (orgCode, studentId) => {
  try {
    // Generate secure token with "temp_" prefix
    const rawToken = `temp_${generateUniqueHash(32, "hex")}`;

    // Hash token before storing (SHA-256)
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Store token hash in database
    const insertQuery = `
      INSERT INTO temp_student_tokens (token_hash, org_code, student_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
      token_hash = VALUES(token_hash),
      created_at = CURRENT_TIMESTAMP,
      is_active = TRUE
    `;

    const result = await query(insertQuery, [tokenHash, orgCode, studentId]);

    logger.info(
      `Temp token generated for student ${studentId} in org ${orgCode}`
    );

    return {
      token: rawToken,
      tokenId: result.insertId || result.affectedRows,
    };
  } catch (err) {
    logger.error(err, `Error generating temp token for student ${studentId}`);
    throw err;
  }
};

// Step 2.2: Token Validation Service
export const validateTempStudentToken = async (token) => {
  try {
    // Hash the provided token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Check if token exists and is active
    const validateQuery = `
      SELECT org_code, student_id, created_at
      FROM temp_student_tokens
      WHERE token_hash = ? AND is_active = TRUE
    `;

    const result = await query(validateQuery, [tokenHash]);

    if (result.length === 0) {
      return {
        isValid: false,
        error: "Invalid or inactive token",
      };
    }

    const tokenData = result[0];
    logger.info(
      `Valid temp token found for student ${tokenData.student_id} in org ${tokenData.org_code}`
    );

    return {
      isValid: true,
      orgCode: tokenData.org_code,
      studentId: tokenData.student_id,
      createdAt: tokenData.created_at,
    };
  } catch (err) {
    logger.error(err, `Error validating temp token`);
    throw err;
  }
};

// Token invalidation service
export const invalidateTempStudentToken = async (orgCode, studentId) => {
  try {
    const updateQuery = `
      UPDATE temp_student_tokens
      SET is_active = FALSE
      WHERE org_code = ? AND student_id = ?
    `;

    const result = await query(updateQuery, [orgCode, studentId]);

    logger.info(
      `Temp token invalidated for student ${studentId} in org ${orgCode}`
    );
    return result;
  } catch (err) {
    logger.error(err, `Error invalidating temp token for student ${studentId}`);
    throw err;
  }
};

// Check if student has active temp token
export const getActiveTempToken = async (orgCode, studentId) => {
  try {
    const selectQuery = `
      SELECT token_hash, created_at
      FROM temp_student_tokens
      WHERE org_code = ? AND student_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await query(selectQuery, [orgCode, studentId]);
    return result.length > 0 ? result[0] : null;
  } catch (err) {
    logger.error(
      err,
      `Error checking active temp token for student ${studentId}`
    );
    throw err;
  }
};
