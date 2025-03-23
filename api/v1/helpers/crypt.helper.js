import crypto from "crypto";
import base64url from "base64url";
import logger from "../../../config/logger.js";

export function encrypt(text, algorithm = "aes-256-cbc", secret) {
  // const secretBuffer = Buffer.from(secret, 'base64');
  // const ivBuffer = Buffer.from(iv, "base64");
  // const cipher = crypto.createCipheriv(algorithm, secretBuffer, ivBuffer);
  // let encrypted = cipher.update(text, "utf8", "base64");
  // encrypted += cipher.final("base64");
  // return `${iv.toString("base64")}:${encrypted}`;

  try {
    const sha256 = crypto.createHash("sha256");
    sha256.update(secret);
    const iv = Buffer.from("talentgigskillgig", "utf8").slice(0, 16);
    const cipher = crypto.createCipheriv(algorithm, sha256.digest(), iv);
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const output = base64url(encrypted);
    return output;
  } catch (err) {
    logger.error(err, `error being received: [encrypt]`);
    return null;
  }
}

export function decrypt(encryptedText, algorithm = "aes-256-cbc", secret) {
  // const secretBuffer = Buffer.from(secret, "base64");
  // const ivBuffer = Buffer.from(iv, "base64");
  // const decipher = crypto.createDecipheriv(algorithm, secretBuffer, ivBuffer);
  // let decrypted = decipher.update(encryptedText, "base64", "utf8");
  // decrypted += decipher.final("utf8");
  // return decrypted;
  const sha256 = crypto.createHash("sha256");
  sha256.update(secret);
  const input = base64url.toBuffer(encryptedText),
    iv = Buffer.from("talentgigskillgig", "utf8").slice(0, 16),
    ciphertext = input;
  const decipher = crypto.createDecipheriv(algorithm, sha256.digest(), iv);
  let decrypted = decipher.update(ciphertext, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export const verifyPassword = async (
  email,
  password,
  secret,
  iv,
  hashedPassword
) => {
  logger.debug(
    email,
    password,
    secret,
    iv,
    hashedPassword,
    `data being received: [verifyPassword]`
  );

  try {
    const encryptedPassword = encrypt(password, "aes-256-cbc", secret);
    logger.debug(encryptedPassword, `data being received: [encryptedPassword]`);

    if (encryptedPassword && encryptedPassword === hashedPassword) return true;
    return false;
  } catch (err) {
    logger.error(
      err,
      "error in controller processing the request:  [verifyPassword]"
    );
    return err;
  }
};
