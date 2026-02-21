
import Appointment from "../models/Appointment.js";



import {  autoMarkMissedInList  , checkAndApplyMissedStatus} from "../utils/updateMissedStatus.js";
import { populateUsersForAppointments } from "../utils/populateUsers.js";
// import { v4 as uuidv4 } from "uuid";

export default class AppointmentService {
  constructor() {}

async createAppointment(data) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {


    // -----------------------------
    // 1. Required field validation
    // -----------------------------
    const requiredFields = [
      "pUserId",
      "dUserId",
      "clinicId",
      "startTime",
      "endTime",
      "appointmentType"
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        await session.abortTransaction();
        return { error: `${field} is required`, code: 400 };
      }
    }

    // -----------------------------
    // 2. Generate appointmentId + telemedicine IDs
    // -----------------------------
    const generateShortId = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let id = '';
      for (let i = 0; i < 10; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
      return id.slice(0, 3) + '-' + id.slice(3, 7) + '-' + id.slice(7);
    };
    const appointmentId = generateShortId();
    const meetingUrl = `http://localhost:3000/video-call/${appointmentId}`;
    const roomName = `consult_${appointmentId}`;

    data.appointmentId = appointmentId;
    // data.meetingId = appointmentId;
    data.meetingUrl = meetingUrl;
    data.roomName = roomName;

    // -----------------------------
    // 3. Normalize dates to UTC
    // -----------------------------
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      await session.abortTransaction();
      return { error: "Invalid date format", code: 400 };
    }

    data.startTime = start;
    data.endTime = end;

    // -----------------------------
    // 4. Prevent past appointments
    // -----------------------------
    const now = new Date();
    if (start.getTime() <= now.getTime()) {
      await session.abortTransaction();
      return { error: "Cannot create appointment in past", code: 400 };
    }

    // -----------------------------
    // 5. Validate time order
    // -----------------------------
    if (end <= start) {
      await session.abortTransaction();
      return { error: "endTime must be greater than startTime", code: 400 };
    }

    // -----------------------------
    // 6. Doctor conflict check
    // -----------------------------
    const doctorConflict = await Appointment.findOne(
      {
        dUserId: data.dUserId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] }
      },
      null,
      { session }
    );

    if (doctorConflict) {
      await session.abortTransaction();
      return {
        error: "Doctor already booked in this time window",
        code: 409,
      };
    }

    // -----------------------------
    // 7. Patient conflict
    // -----------------------------
    const patientConflict = await Appointment.findOne(
      {
        pUserId: data.pUserId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] }
      },
      null,
      { session }
    );

    if (patientConflict) {
      await session.abortTransaction();
      return {
        error: "Patient already has another appointment in this window",
        code: 409,
      };
    }

    // -----------------------------
    // 8. DEFAULT STATUS = SCHEDULED
    // -----------------------------
    data.status = "SCHEDULED";

    // -----------------------------
    // 9. Create Appointment
    // -----------------------------
    const created = await Appointment.create([data], { session });
    await session.commitTransaction();

 

    return { result: created[0].toObject(), code: 200 };
  } catch (err) {
    await session.abortTransaction();
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}



  // --- get appointment by ID (REWRITTEN — PRODUCTION SAFE)
async getAppointmentById(appointmentId) {
  try {

    if (!appointmentId) {
      return { error: "appointmentId required", code: 400 };
    }

    // Step 1: Fetch appointment
    let appt = await Appointment.findOne({ appointmentId:appointmentId }).lean();

    if (!appt) {
      return { error: "Appointment not found", code: 404 };
    }

    // Step 2: Check & mark MISSED if applicable
    const updated = await checkAndApplyMissedStatus(appt);

    // Step 3: Return final updated object
    return { result: updated, code: 200 };
  } catch (err) {

    return { error: "Server Error", code: 500 };
  }
}


  // --- update appointment (allowed only in SCHEDULED)

// --- update appointment (REWRITTEN — production grade)
async updateAppointment(appointmentId, updates) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {

    // ---------------------------------------------------
    // 1. Fetch existing appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    // console.log("Existing appointment:", existing);

    if (!existing) {
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }


    // console.log("Existing status:", existing.status);
    // ---------------------------------------------------
    // 2. Only SCHEDULED can be updated
    // ---------------------------------------------------
    if (existing.status !== "SCHEDULED") {
     
      await session.abortTransaction();
      return {
        error: "Only SCHEDULED appointments can be updated",
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3. Allowed update fields
    // ---------------------------------------------------
    const allowed = [
      "startTime",
      "endTime",
      "appointmentType",
      "dUserId",
    ];
    const payload = {};

    for (const k of allowed) {
      if (updates[k]) {
        if (k === "startTime" || k === "endTime") {
          const dt = new Date(updates[k]);
          if (isNaN(dt.getTime())) {
            await session.abortTransaction();
            return { error: `${k} is invalid date`, code: 400 };
          }
          payload[k] = dt;
        } else {
          payload[k] = updates[k];
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      await session.abortTransaction();
      return { error: "No valid fields to update", code: 400 };
    }

    // ---------------------------------------------------
    // 4. Determine final values for conflict checking
    // ---------------------------------------------------
    const newStart = payload.startTime
      ? new Date(payload.startTime)
      : new Date(existing.startTime);

    const newEnd = payload.endTime
      ? new Date(payload.endTime)
      : new Date(existing.endTime);

    const newDoctor = payload.dUserId || existing.dUserId;
    const patientId = existing.pUserId;

    // ---------------------------------------------------
    // 5. Validate date order & past-time
    // ---------------------------------------------------
    if (newEnd <= newStart) {
      await session.abortTransaction();
      return { error: "endTime must be greater than startTime", code: 400 };
    }

    if (newStart.getTime() <= Date.now()) {
      await session.abortTransaction();
      return { error: "Cannot update appointment to past time", code: 400 };
    }

    // ---------------------------------------------------
    // 6. Doctor availability conflict check
    // ---------------------------------------------------
    const doctorConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        dUserId: newDoctor,
        startTime: { $lt: newEnd },
        endTime: { $gt: newStart },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (doctorConflict) {
  
      await session.abortTransaction();
      return { error: "Doctor not available in this time window", code: 409 };
    }

    // ---------------------------------------------------
    // 7. Patient conflict prevention
    // ---------------------------------------------------
    const patientConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        pUserId: patientId,
        startTime: { $lt: newEnd },
        endTime: { $gt: newStart },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (patientConflict) {
     
      await session.abortTransaction();
      return {
        error: "Patient already has an overlapping appointment",
        code: 409,
      };
    }

    // ---------------------------------------------------
    // 8. Apply update
    // ---------------------------------------------------
    payload.updatedAt = new Date();

    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      { $set: payload },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

  

    return { result: updated, code: 200 };
  } catch (err) {
    await session.abortTransaction();
  
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}





// --- reschedule appointment (REWRITTEN)
async rescheduleAppointment(
  appointmentId,
  newStartTime,
  newEndTime,
  requestedBy = {},
  reason = null
) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {

    // ---------------------------------------------------
    // 1. Load existing appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    // ---------------------------------------------------
    // 2. Validate status
    // ---------------------------------------------------
    if (!["SCHEDULED", "RESCHEDULED"].includes(existing.status)) {
 
      await session.abortTransaction();
      return {
        error: "Reschedule allowed only when SCHEDULED or RESCHEDULED",
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3. Validate new dates
    // ---------------------------------------------------
    const start = new Date(newStartTime);
    const end = new Date(newEndTime);

    if (isNaN(start) || isNaN(end)) {
      await session.abortTransaction();
      return { error: "Invalid start/end time", code: 400 };
    }

    if (end <= start) {
      await session.abortTransaction();
      return { error: "endTime must be greater than startTime", code: 400 };
    }

    if (start.getTime() <= Date.now()) {
      await session.abortTransaction();
      return { error: "Cannot reschedule to past time", code: 400 };
    }

    const doctorId = existing.dUserId;
    const patientId = existing.pUserId;

    // ---------------------------------------------------
    // 4. Doctor conflict
    // ---------------------------------------------------
    const doctorConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        dUserId: doctorId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (doctorConflict) {

      await session.abortTransaction();
      return {
        error: "Doctor already booked in this time window",
        code: 409,
      };
    }

    // ---------------------------------------------------
    // 5. Patient conflict
    // ---------------------------------------------------
    const patientConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        pUserId: patientId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (patientConflict) {

      await session.abortTransaction();
      return {
        error: "Patient already has another appointment in this time window",
        code: 409,
      };
    }

    // ---------------------------------------------------
    // 6. Update
    // ---------------------------------------------------
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      {
        $set: {
          startTime: start,
          endTime: end,
          status: "RESCHEDULED",
          updatedAt: new Date(),
          rescheduleReason: reason || null,
          rescheduledByUserId: requestedBy.userId || null,
          rescheduledByRole: requestedBy.role || null,
        },
      },
      { new: true, session }
    ).lean();

    await session.commitTransaction();


    return { result: updated, code: 200 };
  } catch (err) {
    await session.abortTransaction();
 
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}




  // --- cancel





// --- cancel appointment (REWRITTEN — production safe)
async cancelAppointment(
  clinicId=null,
  appointmentId,
  cancelledByUserId = null,
  cancelledByRole = null,
  reason = null
) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {


    // ---------------------------------------------------
    // 1. Fetch appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    const currentStatus = existing.status;

    // ---------------------------------------------------
    // 2. Only certain statuses allow cancellation
    // ---------------------------------------------------
    const cancellableStatuses = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"];

    if (!cancellableStatuses.includes(currentStatus)) {

      await session.abortTransaction();
      return {
        error: `Cannot cancel appointment in status ${currentStatus}`,
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3. Block double cancellation
    // ---------------------------------------------------
    if (currentStatus === "CANCELLED") {

      await session.abortTransaction();
      return {
        error: "Appointment already cancelled",
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 4. Prepare update payload
    // ---------------------------------------------------
    const update = {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledByUserId: cancelledByUserId || null,
      cancelledByRole: cancelledByRole || null,
      cancelReason: reason || null,
      updatedAt: new Date(),
    };

    // ---------------------------------------------------
    // 5. Apply update atomically
    // ---------------------------------------------------
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      { $set: update },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    // logger.info(
    //   `Appointment cancelled successfully: ${appointmentId}, by ${cancelledByRole} (${cancelledByUserId})`
    // );



    return { result: updated, code: 200 };
  } catch (err) {
    await session.abortTransaction();


    console.error("Cancel appointment error:", err);
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}





// --- list appointments (with calendar/day/week/month filters)
async listAppointments(filters = {}, options = {}) {
  try {
    // logger.info("Listing appointments with filters: " + JSON.stringify(filters));

    const query = {};

    // console.log(filters);
    

    // --------------------------------------
    // 1. Basic Filters
    // --------------------------------------
    if (filters.clinicId) query.clinicId = filters.clinicId;
    if (filters.dUserId) query.dUserId = filters.dUserId;
    if( filters.pUserId) query.pUserId = filters.pUserId;
    if (filters.status) query.status = filters.status;
    if (filters.appointmentId) query.appointmentId = filters.appointmentId;

    // --------------------------------------
    // 2. Calendar Filters (day, week, month)
    //    PRIORITY:
    //    calendar > week > month > startDate range
    // --------------------------------------

    const dateFilter = {};

    // ---- A. DAY FILTER (Specific date)
    if (filters.day) {
      const d = new Date(filters.day);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      dateFilter.$gte = start;
      dateFilter.$lte = end;
    }

    // ---- B. WEEK FILTER (ISO week: Monday–Sunday)

        else if (filters.week) {
          const base = new Date(filters.week);

          let day = base.getDay();
          if (day === 0) day = 7; // ISO: Sunday=7

          const start = new Date(base);
          start.setDate(base.getDate() - (day - 1));
          start.setHours(0, 0, 0, 0);

          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);

          dateFilter.$gte = start;
          dateFilter.$lte = end;
        }


    // ---- C. MONTH FILTER (YYYY-MM)
    else if (filters.month) {
      const [year, month] = filters.month.split("-").map(Number);

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

      dateFilter.$gte = start;
      dateFilter.$lte = end;
    }

    // ---- D. START - END RANGE FILTER
    else if (filters.startDate || filters.endDate) {
      if (filters.startDate)
        dateFilter.$gte = new Date(filters.startDate);
      if (filters.endDate)
        dateFilter.$lte = new Date(filters.endDate);
    }

    // Attach date filter
    if (Object.keys(dateFilter).length > 0) {
      query.startTime = dateFilter;
    }

    // --------------------------------------
    // 3. Pagination + Sorting
    // --------------------------------------
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Number(options.limit) || 25, 100);
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "startTime";
    const sortDir = options.sortDir === "desc" ? -1 : 1;

    // --------------------------------------
    // 4. Fetch data
    // --------------------------------------
    let [items, total] = await Promise.all([
      Appointment.find(query)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean()
        .select('appointmentId startTime endTime status pUserId dUserId  meetingId checkInAt admittedAt callEndedAt appointmentType'),

      Appointment.countDocuments(query),
    ]);


    // --------------------------------------
    // 5. Apply MISSED status auto-check
    // --------------------------------------
    const checks = items.map((appt) =>
      checkAndApplyMissedStatus(appt)
    );

    items = await Promise.all(checks);

    items = await populateUsersForAppointments(items) 
    // --------------------------------------
    // 6. Return Response
    // --------------------------------------
    return {
      result: {
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        items,
      },
      code: 200,
    };
  } catch (err) {

    return { error: "Server Error", code: 500 };
  }
}



async patientCheckIn({ appointmentId, pUserId }) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {

    // ---------------------------------------------------
    // 1. Fetch appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    // ---------------------------------------------------
    // 2. Validate pUserId matches
    // ---------------------------------------------------
    if (existing.pUserId !== pUserId) {

      await session.abortTransaction();
      return { error: "Unauthorized check-in attempt", code: 403 };
    }

    // ---------------------------------------------------
    // 3. Validate status
    // ---------------------------------------------------
    if (existing.status !== "SCHEDULED" && existing.status !== "RESCHEDULED") {
 
      await session.abortTransaction();
      return {
        error: `Cannot check-in appointment in status ${existing.status}`,
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3.5. Time-based validations
    // ---------------------------------------------------
    const now = new Date();
    const fiveMinutesBefore = new Date(existing.startTime.getTime() - 5 * 60 * 1000);

    if (now < fiveMinutesBefore) {
      await session.abortTransaction();
      return { error: "Check-in not allowed yet. Please check in 5 minutes before your appointment.", code: 400 };
    }

    if (now >= existing.endTime) {
      await session.abortTransaction();
      return { error: "Appointment has already ended. Cannot check in.", code: 400 };
    }

    // ---------------------------------------------------
    // 4. Update status to CHECKED_IN
    // ---------------------------------------------------
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      {
        $set: {
          status: "CHECKED_IN",
          checkInAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true, session }
    ).lean();

    await session.commitTransaction();


    return { result: updated.status, code: 200 };
  } catch (err) {
    await session.abortTransaction();

    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }  }                                     

}
