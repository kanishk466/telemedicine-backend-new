import AppointmentConsent from "../models/AppointmentConsent.js";

export async function hasActiveConsent({
  appointmentId,
  userId,
  consentType
}) {
  const latest = await AppointmentConsent.findOne({
    appointmentId,
    userId,
    consentType
  })
    .sort({ createdAt: -1 })
    .lean();

  return latest?.action === "GRANTED";
}
