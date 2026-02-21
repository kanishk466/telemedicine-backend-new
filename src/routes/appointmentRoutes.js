
import { Router } from "express";
import {
  create, getById, update, reschedule, cancel,
    list , admitPatient , patientCheckIn
} from "../controllers/AppointmentController.js";

import { startCompostion, startRecording , stopRecording } from "../controllers/RecordingController.js";
import { getConsultationMetrics } from "../utils/getConsulationService.js";
import { getAppointmentAudits } from "../services/audit.service.js";
const router = Router();

router.post("/create", create);
router.get("/list", list);
router.get("/:appointmentId", getById);
router.put("/update/:appointmentId", update);
router.patch("/reschedule/:appointmentId", reschedule);
router.patch("/cancel/:appointmentId", cancel);
router.patch("/:id/admit",admitPatient);
router.post("/:appointmentId/check-in", patientCheckIn);


// Recording routes
router.post("/:appointmentId/recording/start", startRecording);
router.post("/:appointmentId/recording/stop", stopRecording);
router.post("/:appointmentId/start/composition" , startCompostion);

//Consultation Metrics
router.get("/:appointmentId/consultation-metrics", getConsultationMetrics);
router.get("/:appointmentId/audits", getAppointmentAudits);

// Appointment Audit routes


export default router;
