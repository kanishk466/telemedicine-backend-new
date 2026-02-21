import AppointmentConsent from "../models/AppointmentConsent.js";
import { recordAppointmentAudit } from "./audit.service.js";

export async function recordConsent({
  appointmentId,
  user,
  consentType,
  action,
  consentTextVersion,
  req
}) {
  // 1️⃣ Save consent history
  await AppointmentConsent.create({
    appointmentId,
    userId: user.id,
    role: user.role,
    consentType,
    action,
    consentTextVersion,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"]
  });

  // 2️⃣ Link to audit trail
  await recordAppointmentAudit({
    appointmentId,
    action:
      action === "GRANTED"
        ? "CONSENT_GRANTED"
        : "CONSENT_WITHDRAWN",
    user,
    req,
    metadata: {
      consentType,
      consentTextVersion
    }
  });
}
