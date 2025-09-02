import { Router } from "express";
const router = Router();
import {
  loginController,
  raiseStudentInfoRequest,
  registerNewUserController,
  resendOtpController,
  validateRefreshTokenAndGenerateNewAuthToken,
  // createUserWithMagicLinkAndGenerateOtp,
  verifyOrgCodeController,
  verifyUserOtpController,
} from "../controllers/auth.controller.js";
import { checkStudentStatusController } from "../controllers/student-status.controller.js";
import {
  authTokenGeneratorValidator,
  loginRequestValidator,
  validateOTPRequest,
  verifyOrgCodeValidator,
  checkStudentStatusValidator,
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

router.post("/raise-student-info-request", raiseStudentInfoRequest);
 
router.post("/resend-otp", loginRequestValidator, resendOtpController);

// Step 5.1: Create student status check endpoint
router.get(
  "/check-student-status",
  checkStudentStatusValidator,
  checkStudentStatusController
);

export default router;
