import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { meetingService } from "../services/meeting.service.js";
// import DoctorSessionService from "../services/DoctorSession.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
// import DoctorSession from "../models/DoctorSession.js";
import { recordAppointmentAudit } from "../services/audit.service.js";
// import { log } from "winston";


/* =====================================================
 * JOIN MEETING
 * ===================================================== */
/**
 * Handles joining a meeting for patients and doctors.
 * Patients can join only after doctor starts consultation.
 * Doctors start the consultation and create the room.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const joinMeeting = async (req, res) => {
  try {
    const { meetingId, role, userId ,clinicId} = req.body;

    // Input validation
    if (!meetingId || !role || !userId) {
      return errorResponse(
        res,
        "Missing required fields: meetingId, role, userId",
        400
      );
    }

    if (!["PATIENT", "DOCTOR"].includes(role)) {
      return errorResponse(res, "Invalid role. Must be PATIENT or DOCTOR", 400);
    }


    /* ---------------------------------------
     * 1. Fetch appointment by meetingId
     * --------------------------------------- */
    const appointment = await Appointment.findOne({ appointmentId:meetingId });

    if (!appointment) {
      return errorResponse(res, "Appointment not found", 404);
    }


   const users = await User.find({ userId: userId }).select("firstName lastName").lean();

  //  console.log("users", users);
 


    // const identity = `${role.toLowerCase()}-${userId}`;
    // const identity = `${users[0].firstName} ${users[0].lastName}-${role.toLowerCase()}-${userId}`;
 const identity = `${role.toLowerCase()}-${userId} ${users[0].firstName} ${users[0].lastName}`;
    // const identity = {
    //   userId: userId,
    //   name: `${users[0].firstName} ${users[0].lastName}`,
    //   role: role
    // }

  // console.log("identity" , identity);
  

    /* =====================================================
     * PATIENT FLOW
     * ===================================================== */
    if (role === "PATIENT") {
      // Ownership check
      if (appointment.pUserId !== userId) {
        await recordAppointmentAudit({
          clinicId,
          appointmentId: appointment.appointmentId,
          action: "MEETING_ACCESS_DENIED",
          user: { id: userId, role: "PATIENT" },
          req,
          metadata: { reason: "NOT_APPOINTMENT_OWNER" }
        });

        return errorResponse(res, "Unauthorized patient", 403);
      }

      // Doctor has not started consultation
      // if (appointment.status !== "IN_CONSULTATION") {
      //   return errorResponse(res, "Waiting for doctor to start consultation", 403);
      // }

      if (!["ADMITTED", "IN_CONSULTATION"].includes(appointment.status)) {
        return errorResponse(
          res,
          "Waiting for doctor to admit/start consultation",
          403
        );
      }

      // Token generation (room already exists)
      const token = meetingService.generateToken(
        identity,
        appointment.roomName
      );

      // console.log("patient token", token);

      // await recordAppointmentAudit({
      //   appointmentId: appointment.appointmentId,
      //   action: "JOIN_CONSULTATION",
      //   user: { id: userId, role: "PATIENT" },
      //   req,
      //   metadata: {
      //     // meetingId: appointment.meetingId,
      //     roomName: appointment.roomName
      //   }
      // });


      return successResponse(
        res,
        {
          role,
          token,
          roomName: appointment.roomName,
          appointmentId: appointment.appointmentId,
          // meetingId: appointment.meetingId,
          status: appointment.status,
          identity
        },
        "Patient joined meeting successfully"
      );
    }



/* =====================================================
 * DOCTOR FLOW (NO DoctorSession)
 * ===================================================== */
if (role === "DOCTOR") {
  // Ownership check
  if (appointment.dUserId !== userId) {
    await recordAppointmentAudit({
      clinicId,
      appointmentId: appointment.appointmentId,
      action: "MEETING_ACCESS_DENIED",
      user: { id: userId, role: "DOCTOR" },
      req,
      metadata: { reason: "NOT_APPOINTMENT_OWNER" }
    });

    return errorResponse(res, "Unauthorized doctor", 403);
  }

  // Status validation
  if (!["ADMITTED", "IN_CONSULTATION"].includes(appointment.status)) {
    return errorResponse(
      res,
      `Cannot start consultation in status ${appointment.status}`,
      400
    );
  }

  // Room safety
  if (!appointment.roomName) {

    return errorResponse(
      res,
      "Room name not initialized for appointment",
      500
    );
  }

  // Ensure Twilio room exists
  await meetingService.ensureRoom(appointment.roomName);

  // Audit
  // await recordAppointmentAudit({
  //   appointmentId: appointment.appointmentId,
  //   action: "START_CONSULTATION",
  //   user: { id: userId, role: "DOCTOR" },
  //   req,
  //   metadata: {
  //     // meetingId: appointment.meetingId,
  //     roomName: appointment.roomName
  //   }
  // });


  await appointment.save();

  // Generate token
  const token = meetingService.generateToken(
    identity,
    appointment.roomName
  );

  return successResponse(
    res,
    {
      role,
      token,
      roomName: appointment.roomName,
      appointmentId: appointment.appointmentId,
      // meetingId: appointment.meetingId,
      status: appointment.status,
      identity
    },
    "Doctor joined consultation successfully"
  );
}


    /* ---------------------------------------
     * Invalid role (should not reach here due to validation)
     * --------------------------------------- */
    return errorResponse(res, "Invalid role", 400);
  } catch (err) {
    console.error("joinMeeting error:", err);


    return errorResponse(res, "Failed to join meeting", 500);
  }
};


