import crypto from "crypto";
import { readFileToNconf } from "../../../config/index.js";
import jwt from "jsonwebtoken";
const nconf = readFileToNconf();

export const sendApiError = (res, error, statusCode = 500) => {
  return res.status(statusCode).json({ message: "failure", error });
};

export const sendApiResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    message: "success",
    data,
  });
};

export const generateUniqueHash = (length, type = "hex") => {
  return crypto.randomBytes(length).toString(type);
};

export const generateAuthToken = (payload) => {
  const secret = nconf.get("accessTokenSecret");
  const expiration = nconf.get("jwtExpirations");
  const token = jwt.sign(payload, secret, {
    expiresIn: expiration.accessTokenExpiresIn,
  });
  return token;
};

export const generateRefreshToken = (payload) => {
  const secret = nconf.get("refreshTokenSecret");
  const expiration = nconf.get("jwtExpirations");
  const token = jwt.sign(payload, secret, {
    expiresIn: expiration.refreshTokenExpiresIn,
  });
  return token;
};

export const generateAuthTokenForAdminAccess = (payload) => {
  const secret = nconf.get("accessTokenSecretForAdmin");
  const expiration = nconf.get("adminJwtExpirations");
  const token = jwt.sign(payload, secret, {
    expiresIn: expiration.accessTokenExpiresIn,
  });
  return token;
};

export const generateAuthTokenForCoachAccess = (payload) => {
  const secret = nconf.get("accessTokenSecretForCoach");
  const expiration = nconf.get("coachJwtExpirations");
  const token = jwt.sign(payload, secret, {
    expiresIn: expiration.accessTokenExpiresIn,
  });
  return token;
};

export const generateOtpDigits = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const verifyRefreshToken = async (token) => {
  const secret = nconf.get("refreshTokenSecret");
  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          reject({
            isValid: false,
            error: err,
          });
        } else {
          resolve({
            isValid: true,
            data: { ...decoded },
          });
        }
      });
    });
    return decoded;
  } catch (err) {
    throw err;
  }
};

export const verifyAuthToken = async (token) => {
  const secret = nconf.get("accessTokenSecret");
  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          reject({
            isValid: false,
            error: err,
          });
        } else {
          resolve({
            isValid: true,
            data: { ...decoded },
          });
        }
      });
    });
    return decoded;
  } catch (err) {
    throw err;
  }
};
