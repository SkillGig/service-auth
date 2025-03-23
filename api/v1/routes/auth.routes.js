import { Router } from "express";
const router = Router();
import {
  loginController,
  registerNewUserController,
  resendOtpController,
  validateRefreshTokenAndGenerateNewAuthToken,
  // createUserWithMagicLinkAndGenerateOtp,
  verifyOrgCodeController,
  verifyUserOtpController,
} from "../controllers/auth.controller.js";
import {
  authTokenGeneratorValidator,
  loginRequestValidator,
  validateOTPRequest,
  verifyOrgCodeValidator,
} from "../validators/auth.validator.js";

// router.get(
//   "/generate-otp",
//   loginMiddleWare,
//   createUserWithMagicLinkAndGenerateOtp
// );

router.get("/verify-org", verifyOrgCodeValidator, verifyOrgCodeController);

router.post("/login", loginRequestValidator, loginController);

router.post(
  "/register-new-user",
  loginRequestValidator,
  registerNewUserController
);

router.post("/verify-otp", validateOTPRequest, verifyUserOtpController);

router.get(
  "/generate-new-auth-token",
  authTokenGeneratorValidator,
  validateRefreshTokenAndGenerateNewAuthToken
);

router.post("/resend-otp", loginRequestValidator, resendOtpController);

export default router;
