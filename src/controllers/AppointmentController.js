// src/controllers/AppointmentController.js
import AppointmentService from "../services/AppointmentService.js";
import { successResponse, errorResponse } from "../utils/response.js";

import { admitPatientService } from "../services/admit.service.js";

import { recordAppointmentAudit } from "../services/audit.service.js";

import {
  sendAppointmentCreatedEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
} from "../services/notification.service.js";
import UserService from "../services/UserService.js";

const service = new AppointmentService();
const userService = new UserService();

export const create = async (req, res) => {
  try {
    // console.log(req.body);
    // console.log("Creating appointment...", req.body.clinicId);

    const { result, error, code } = await service.createAppointment(req.body);

    if (error) return errorResponse(res, error, code);

    await recordAppointmentAudit({
      clinicId: req.body.clinicId,
      appointmentId: result.appointmentId,
      action: "CREATE_APPOINTMENT",
      newStatus: "SCHEDULED",
      user: req.body?.bookedByUserId
        ? { id: req.body.bookedByUserId, role: req.body.bookedByRole }
        : null,
      req,
    });

    const patient = await userService.getUserById(result.pUserId);
    const doctor = await userService.getUserById(result.dUserId);

    const date = new Date(result.startTime).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const time = new Date(result.startTime).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // console.log("patient" , patient);
    // console.log("doctor" , doctor);

    await sendAppointmentCreatedEmail({
      patientName:
        patient.result.firstName +
        " " +
        patient.result?.middleName +
        " " +
        patient.result.lastName,
      email: "anand.chaurasia@itdoseinfo.com",
      date,
      time,
      doctorName:
        doctor.result.firstName +
        " " +
        doctor.result?.middleName +
        " " +
        doctor.result.lastName,
      joinUrl: result.meetingUrl,
    });

    return successResponse(res, "Appointment created", 200);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const getById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { result, error, code } =
      await service.getAppointmentById(appointmentId);
    if (error) return errorResponse(res, error, code);
    // console.log(result);

    return successResponse(res, result, "Appointment fetched", 200);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const update = async (req, res) => {
  try {
    // console.log("Updating appointment...", req.params.appointmentId);
    const appointmentId = req.params.appointmentId;
    const updates = req.body;
    // console.log("Updates:", updates);
    const { result, error, code } = await service.updateAppointment(
      appointmentId,
      updates,
    );

    // console.log("Update result:", result, error, code);
    if (error) return errorResponse(res, error, code);

    await recordAppointmentAudit({
      clinicId: req.body.clinicId,
      appointmentId: appointmentId,
      action: "UPDATE_APPOINTMENT",
      user: { id: req.body?.updatedByUserId, role: req.body?.updatedByRole },
      req,
      metadata: { updates },
    });

    const patient = await userService.getUserById(result.pUserId);
    const doctor = await userService.getUserById(result.dUserId);

    const date = new Date(result.startTime).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const time = new Date(result.startTime).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    await sendAppointmentRescheduledEmail({
      patientName:
        patient.result.firstName +
        " " +
        patient.result?.middleName +
        " " +
        patient.result.lastName,
      email: "anand.chaurasia@itdoseinfo.com",
      date,
      time,
      doctorName:
        doctor.result.firstName +
        " " +
        doctor.result?.middleName +
        " " +
        doctor.result.lastName,
      joinUrl: result.meetingUrl,
    });

    return successResponse(res, "Appointment updated", 200);
  } catch (err) {
    console.error("Update appointment error:", err);
    return errorResponse(res, "Server error", 500);
  }
};

export const reschedule = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const {
      newStartTime,
      newEndTime,
      requestedByUserId,
      requestedByRole,
      reason,
    } = req.body;

    await recordAppointmentAudit({
      appointmentId: appointmentId,
      action: "RESCHEDULE_APPOINTMENT",
      user: { id: requestedByUserId, role: requestedByRole },
      req,
      metadata: { newStartTime, newEndTime, reason },
    });
    const { result, error, code } = await service.rescheduleAppointment(
      appointmentId,
      newStartTime,
      newEndTime,
      { userId: requestedByUserId, role: requestedByRole },
      reason,
    );
    if (error) return errorResponse(res, error, code);
    return successResponse(res, result, "Appointment rescheduled", 200);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const cancel = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const { cancelledByUserId, cancelledByRole, reason , clinicId } = req.body;

    // console.log("Cancelling appointment...", clinicId);
    const { result, error, code } = await service.cancelAppointment(
      clinicId,
      appointmentId,
      cancelledByUserId,
      cancelledByRole,
      reason,
    );
    if (error) return errorResponse(res, error, code);

    await recordAppointmentAudit({
      clinicId,
      appointmentId: appointmentId,
      action: "CANCEL_APPOINTMENT",
      newStatus: "CANCELLED",
      user: { id: cancelledByUserId, role: cancelledByRole },
      req,
      metadata: { reason },
    });


    const patient = await userService.getUserById(result.pUserId);
    const doctor = await userService.getUserById(result.dUserId);

    const date = new Date(result.startTime).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const time = new Date(result.startTime).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });


    await sendAppointmentCancelledEmail({
      patientName:
        patient.result.firstName +
        " " +
        patient.result?.middleName +
        " " +
        patient.result.lastName,
      email: "anand.chaurasia@itdoseinfo.com",
      date,
      time,
      doctorName:
        doctor.result.firstName +
        " " +
        doctor.result?.middleName +
        " " +
        doctor.result.lastName,
    });

    return successResponse(res, result, "Appointment cancelled", 200);
  } catch (err) {
    console.error("Cancel appointment error:", err);
    return errorResponse(res, "Server error", 500);
  }
};

export const admitPatient = async (req, res) => {
  const { id } = req.params; // appointmentId
  const { userId, clinicId } = req.body;

  const { result, error, code } = await admitPatientService(id, userId);

  if (error) {
    return res.status(code).json({ success: false, message: error });
  }

  //  auditLogger.info({
  //     event: "ADMIT_PATIENT",
  //     userId: userId,
  //     role: "DOCTOR",
  //     appointmentId: id,
  //     ipAddress: req.ip,
  //     userAgent: req.headers["user-agent"],
  //     timestamp: new Date().toISOString()
  //   });

  await recordAppointmentAudit({
    clinicId: clinicId,
    appointmentId: id,
    action: "ADMIT_PATIENT",
    oldStatus: "CHECKED_IN",
    newStatus: "ADMITTED",
    user: { id: userId, role: "DOCTOR" },
    req,
  });

  return res.json({ success: true, data: result });
};

export const patientCheckIn = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId , clinicId } = req.body; 

    const { result, error, code } = await service.patientCheckIn({
      appointmentId,
      pUserId: userId,
    });

    if (error) return errorResponse(res, error, code);



    await recordAppointmentAudit({
      clinicId,
      appointmentId: appointmentId,
      action: "PATIENT_CHECK_IN",
      oldStatus: "SCHEDULED",
      newStatus: "CHECKED_IN",
      user: { id: userId, role: "PATIENT" },
      req,
    });

    return successResponse(res, result, "Patient checked in", 200);
  } catch (err) {
    console.error("Patient check-in error:", err);
    return errorResponse(res, "Server error", 500);
  }
};

export const list = async (req, res) => {
  try {
    const filters = {
      clinicId: req.query.clinicId,
      appointmentId: req.query.appointmentId,
      dUserId: req.query.dUserId,
      status: req.query.status,
      pUserId: req.query.pUserId,
      day: req.query.day,
      week: req.query.week,
      month: req.query.month,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
    };
    const { result, error, code } = await service.listAppointments(
      filters,
      options,
    );
    if (error) return errorResponse(res, error, code);
    return successResponse(res, result, "Appointments listed", 200);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};
