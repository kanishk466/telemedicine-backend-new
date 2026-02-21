import Appointment from "../models/Appointment.js";
import { meetingService } from "../services/meeting.service.js";
import { recordAppointmentAudit } from "../services/audit.service.js";





export const endConsultation = async (req, res) => {
  try {
    const { appointmentId, dUserId , clinicId} = req.body;

    const appt = await Appointment.findOne({ appointmentId });
    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Doctor authorization
    if (appt.dUserId !== dUserId) {
      await recordAppointmentAudit({
        clinicId,
        appointmentId,
        action: "END_CONSULTATION_DENIED",
        user: { id: dUserId, role: "DOCTOR" },
        req,
        metadata: { reason: "NOT_APPOINTMENT_DOCTOR" },
      });

      return res.status(403).json({
        success: false,
        message: "Unauthorized doctor",
      });
    }

    // ✅ Allowed states
    const canEnd =
      appt.status === "IN_CONSULTATION" ||
      (appt.status === "ADMITTED" && !appt.patientJoinedAt);

    if (!canEnd) {
      await recordAppointmentAudit({
        clinicId,
        appointmentId,
        
        action: "END_CONSULTATION_BLOCKED",
        user: { id: dUserId, role: "DOCTOR" },
        req,
        metadata: {
          currentStatus: appt.status,
          patientJoinedAt: appt.patientJoinedAt || null,
          reason: "INVALID_STATE",
        },
      });

      return res.status(400).json({
        success: false,
        message: `Cannot end consultation in status ${appt.status}`,
      });
    }

    // 🔔 End Twilio room (webhook will come later)
    if (appt.roomSid) {
      try {
        await meetingService.endRoomBySid(appt.roomSid);
      } catch (err) {
        console.error("Failed to end Twilio room", {
          appointmentId,
          roomSid: appt.roomSid,
          error: err.message,
        });
      }
    }

    // 🔒 Soft lock (doctor intent)
    appt.status = "COMPLETED";
    appt.callEndedAt = new Date();
    appt.twilioRoomStatus = "COMPLETED";
    await appt.save();

    await recordAppointmentAudit({
      clinicId,
      appointmentId,
      action: "END_CONSULTATION", 
      oldStatus: appt.status,
      newStatus: "COMPLETED",
      user: { id: dUserId, role: "DOCTOR" },
      req,
      metadata: {
        roomSid: appt.roomSid,
        callEndedAt: appt.callEndedAt,
      },
    });

    return res.json({
      success: true,
      message: "Consultation ended successfully",
      appointmentId,
      status: appt.status,
      recordingStatus: "PROCESSING",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to end consultation",
    });
  }
};
