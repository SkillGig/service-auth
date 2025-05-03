import { Router } from "express";
import { coachLoginController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", coachLoginController);

export default router;
