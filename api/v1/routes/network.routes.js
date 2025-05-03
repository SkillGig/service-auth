import { Router } from "express";
import { adminLoginController, coachLoginController } from "../controllers/auth.controller.js";

const router = Router();

router.post('/login', adminLoginController);

export default router;