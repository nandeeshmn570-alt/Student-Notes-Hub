import express from "express";

import { requireAccessToken } from "../middleware/authorization.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/register", authController.registerStudent);
router.post("/login", authController.loginUser);
router.post("/refresh", authController.refreshUserSession);
router.get("/check-admin", requireAccessToken, authController.checkAdminStatus);
router.post("/logout", authController.logoutUser);

export default router;
