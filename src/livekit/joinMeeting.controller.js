import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { AccessToken } from "livekit-server-sdk";
import { successResponse, errorResponse } from "../utils/response.js";
import { recordAppointmentAudit } from "../services/audit.service.js";

export const joinMeeting = async (req, res) => {
  try {
    // console.log("joinMeeting called with body:", req.body);
    const { meetingId, role, userId } = req.body;

    
    if (!meetingId || !role || !userId) {
      return errorResponse(
        res,
        "Missing required fields: meetingId, role, userId",
        400
      );
    }

    if (!["PATIENT", "DOCTOR"].includes(role)) {
      return errorResponse(res, "Invalid role", 400);
    }

    /* ---------------------------------------
     * 1. Fetch appointment
     * --------------------------------------- */
    const appointment = await Appointment.findOne({
      appointmentId: meetingId,
    });

    if (!appointment) {
      return errorResponse(res, "Appointment not found", 404);
    }

    /* ---------------------------------------
     * 2. Fetch user (for identity)
     * --------------------------------------- */
    const user = await User.findOne({ userId })
      .select("firstName lastName")
      .lean();

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const identity = `${appointment.appointmentId}:${userId}:${role.toLowerCase()}`;

    // console.log(`joinMeeting requested - AppointmentId: ${appointment.appointmentId}, UserId: ${userId}, Role: ${role}, Identity: ${identity}`);

    /* =====================================================
     * PATIENT FLOW
     * ===================================================== */
    if (role === "PATIENT") {
      if (appointment.pUserId !== userId) {
        await recordAppointmentAudit({
          appointmentId: appointment.appointmentId,
          action: "MEETING_ACCESS_DENIED",
          user: { id: userId, role: "PATIENT" },
          req,
          metadata: { reason: "NOT_APPOINTMENT_OWNER" },
        });

        return errorResponse(res, "Unauthorized patient", 403);
      }

      if (!["ADMITTED", "IN_CONSULTATION"].includes(appointment.status)) {
        return errorResponse(
          res,
          "Waiting for doctor to admit/start consultation",
          403
        );
      }

      const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        { identity }
      );

      token.addGrant({
        roomJoin: true,
        room: appointment.roomName,
        canPublish: false,
        canSubscribe: true,
      });

      return successResponse(
        res,
        {
          role,
          token: await token.toJwt(),
          roomName: appointment.roomName,
          appointmentId: appointment.appointmentId,
          status: appointment.status,
          identity,
        },
        "Patient joined meeting successfully"
      );
    }

    /* =====================================================
     * DOCTOR FLOW
     * ===================================================== */
    if (role === "DOCTOR") {
      if (appointment.dUserId !== userId) {
        await recordAppointmentAudit({
          appointmentId: appointment.appointmentId,
          action: "MEETING_ACCESS_DENIED",
          user: { id: userId, role: "DOCTOR" },
          req,
          metadata: { reason: "NOT_APPOINTMENT_OWNER" },
        });

        return errorResponse(res, "Unauthorized doctor", 403);
      }

      if (!["ADMITTED", "IN_CONSULTATION"].includes(appointment.status)) {
        return errorResponse(
          res,
          `Cannot start consultation in status ${appointment.status}`,
          400
        );
      }

      if (!appointment.roomName) {
        return errorResponse(res, "Room not initialized", 500);
      }

      const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        { identity }
      );

      token.addGrant({
        roomJoin: true,
        room: appointment.roomName,
        canPublish: true,
        canSubscribe: true,
      });

      return successResponse(
        res,
        {
          role,
          token: await token.toJwt(),
          roomName: appointment.roomName,
          appointmentId: appointment.appointmentId,
          status: appointment.status,
          identity,
        },
        "Doctor joined consultation successfully"
      );
    }

    return errorResponse(res, "Invalid role", 400);
  } catch (err) {
    console.error("joinMeeting error:", err);
    return errorResponse(res, "Failed to join meeting", 500);
  }
};
