import { body, validationResult, query, header } from "express-validator";

const validatorCallback = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const generateOtpValidator = [
  body("studentId").notEmpty().withMessage("StudentId is required"),
  (req, res, next) => validatorCallback(req, res, next),
];

export const verifyOrgCodeValidator = [
  query("orgCode")
    .notEmpty()
    .withMessage("The Org Code is not valid. Please enter a valid Org Code"),
  (req, res, next) => validatorCallback(req, res, next),
];

export const loginRequestValidator = [
  body("orgCode").notEmpty().withMessage("Org Code is required"),
  body("studentId").notEmpty().withMessage("Student id is required"),
  header("platform")
    .notEmpty()
    .withMessage("Platform header is required")
    .isIn(["android", "ios", "web"])
    .withMessage("Provide a valid platform"),
  (req, res, next) => validatorCallback(req, res, next),
];

export const validateOTPRequest = [
  body("otpId")
    .notEmpty()
    .withMessage("OTP_ID is required"),

  body("otp")
    .isNumeric()
    .withMessage("OTP must be a number")
    .isLength(4)
    .withMessage("OTP must be of 4 digits"),

  header("platform")
    .notEmpty()
    .withMessage("Platform header is required")
    .isIn(["android", "ios", "web"])
    .withMessage("Provide a valid platform"),

  (req, res, next) => validatorCallback(req, res, next),
];

export const authTokenGeneratorValidator = [
  header("x-refresh-token")
    .notEmpty()
    .withMessage("Please provide a valid refresh token"),
  header("platform")
    .notEmpty()
    .withMessage("Platform header is required")
    .isIn(["android", "ios", "web"])
    .withMessage("Provide a valid platform"),
];
