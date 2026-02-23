import { Router } from "express";
import { getDoctorsByClinic } from "../controllers/UserController.js";
import { register , login } from "../controllers/auth.controller.js";

const router = Router();

// router.get("/doctors/:clinicId/:searchQuery", getDoctorsByClinic);
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/clinics/:clinicId/:role", getDoctorsByClinic);

export default router;

