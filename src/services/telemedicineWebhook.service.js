

import Appointment from "../models/Appointment.js";

import { recordAppointmentAudit } from "../services/audit.service.js";
class TwilioWebhookService {
  async handle(payload) {
    try {

      console.log('payload:', payload);

      const event =
        payload.StatusCallbackEvent || payload.EventType || payload.Event || "";


      // console.log('event:', event);

      const roomName = payload.RoomName || payload.UniqueName;
      if (!roomName) {
        return;
      }

      if (!roomName.startsWith("consult_")) {
        return;
      }

      const appointmentId = roomName.replace("consult_", "");
      const eventId = this._generateEventId(payload, event, roomName);

      const clinicId = await Appointment.findOne({ appointmentId }).select("clinicId").lean().then(doc => doc?.clinicId);
      /* ------------------------------------------------------
       * Idempotency check
       * ------------------------------------------------------ */
      if (eventId) {
        const alreadyProcessed = await Appointment.exists({
          appointmentId,
          webhookEventsProcessed: eventId,
        });

        if (alreadyProcessed) {
          return;
        }
      }

      /* ------------------------------------------------------
       * Dispatch
       * ------------------------------------------------------ */
      switch (event.toLowerCase()) {
        case "room-created":
        case "room.in-progress":
          break;

        case "participant-connected":
        case "participant.connected":
          await this.participantConnected(appointmentId, payload, eventId , clinicId);
          break;

        case "room-ended":
        case "room.completed":
          await this.roomEnded(appointmentId, eventId , clinicId);
          break;

        case "recording-completed":
        case "recording.completed":
          await this.recordingCompleted(appointmentId, payload, eventId, clinicId);
          break;

        case "participant-disconnected":
        case "participant.disconnected":
          await this.participantDisconnected(appointmentId, payload, eventId,clinicId);
          break;

        default:
          console.log("Unhandled Twilio event", event);

      }
    } catch (err) {
      console.error("Webhook Handler Error", {
        error: err.message,
        stack: err.stack,
      });
    }
  }

  /* ==========================================================
   * PARTICIPANT CONNECTED (RACE-SAFE)
   * ========================================================== */
  // async participantConnected(appointmentId, payload, eventId) {
  //   try {
  //     const identity = payload.ParticipantIdentity;
  //     console.log("identiry paritcipantconnected", identity);
  //     if (!identity) return;


  //     /* ---------------------------------------
  //      * Phase 1: Always add participant
  //      * --------------------------------------- */
  //     await Appointment.updateOne(
  //       { appointmentId },
  //       {
  //         $addToSet: {
  //           participantsJoined: identity,
  //           webhookEventsProcessed: eventId,
  //         },
  //         $set: {
  //           twilioRoomStatus: "IN_PROGRESS",
  //           updatedAt: new Date(),
  //         },
  //       }
  //     );

  //     /* ---------------------------------------
  //      * Phase 2: Atomic transition to IN_CONSULTATION
  //      * Only ONE webhook can win this
  //      * --------------------------------------- */
  //     const transition = await Appointment.updateOne(
  //       {
  //         appointmentId,
  //         status: "ADMITTED",
  //         $and: [
  //           { participantsJoined: { $elemMatch: { $regex: "^doctor-" } } },
  //           { participantsJoined: { $elemMatch: { $regex: "^patient-" } } },
  //         ],
  //       },
  //       {
  //         $set: {
  //           status: "IN_CONSULTATION",
  //           consultationStartedAt: new Date(),
  //         },
  //         $inc: { version: 1 },
  //       }
  //     );



  //     await recordAppointmentAudit({
  //       appointmentId: appointmentId,
  //       action: "PARTICIPANT_CONNECTED",
  //       newStatus: transition.modifiedCount === 1 ? "IN_CONSULTATION" : null,
  //       user: identity.startsWith("doctor-")
  //         ? { id: identity.replace("doctor-", ""), role: "DOCTOR" }
  //         : identity.startsWith("patient-")
  //           ? { id: identity.replace("patient-", ""), role: "PATIENT" }
  //           : null,
  //       req: null
  //     });
  //   } catch (err) {
  //     console.error("participantConnected error", err);
  //   }
  // }




  async participantConnected(appointmentId, payload, eventId , clinicId) {
    try {
      
      const identity = payload.ParticipantIdentity;
      if (!identity) {
        return;
      }

      const now = new Date();

      const isDoctor = identity.startsWith("doctor-");
      const isPatient = identity.startsWith("patient-");

      const roomSid = payload.RoomSid;

      if (roomSid) {
         await Appointment.updateOne(
          {
            appointmentId,
            roomSid: { $exists: false }, // overwrite mat karo
          },
          {
            $set: {
              roomSid,
              updatedAt: now,
            },
          }
        );
      }

      /* ---------------------------------------
       * Phase 1: Persist JOIN (authoritative)
       * --------------------------------------- */
       await Appointment.updateOne(
        {
          appointmentId,
          ...(isDoctor && { doctorJoinedAt: { $exists: false } }),
          ...(isPatient && { patientJoinedAt: { $exists: false } }),
        },
        {
          $set: {
            ...(isDoctor && { doctorJoinedAt: now }),
            ...(isPatient && { patientJoinedAt: now }),
            updatedAt: now,
          },
        }
      );

      /* ---------------------------------------
       * Phase 2: Presence (non-authoritative)
       * --------------------------------------- */
       await Appointment.updateOne(
        { appointmentId },
        {
          $addToSet: {
            participantsJoined: identity,
            webhookEventsProcessed: eventId,
          },
          $set: {
            twilioRoomStatus: "IN_PROGRESS",
            updatedAt: now,
          },
        }
      );

      /* ---------------------------------------
       * Phase 3: Atomic transition to IN_CONSULTATION
       * --------------------------------------- */
      const transition = await Appointment.updateOne(
        {
          appointmentId,
          status: "ADMITTED",
          doctorJoinedAt: { $exists: true },
          patientJoinedAt: { $exists: true },
        },
        {
          $set: {
            status: "IN_CONSULTATION",
            consultationStartedAt: now,
          },
        }
      );

      const userInfo = isDoctor
        ? { id: identity.replace("doctor-", ""), role: "DOCTOR" }
        : isPatient
          ? { id: identity.replace("patient-", ""), role: "PATIENT" }
          : null;

      await recordAppointmentAudit({
        clinicId,
        appointmentId,
        action: "PARTICIPANT_CONNECTED",
        oldStatus: "ADMITTED",
        newStatus: transition.modifiedCount === 1 ? "IN_CONSULTATION" : null,
        user: userInfo,
        req: null,
      });
      
    } catch (err) {
      console.error("participantConnected error", err);
      console.error("[DEBUG] Full error stack:", err.stack);
    }
  }


  async participantDisconnected(appointmentId, payload, eventId, clinicId) {
    const identity = payload.ParticipantIdentity;
    console.log("identitty", identity);

    if (!identity) return;

    await Appointment.updateOne(
      { appointmentId },
      {
        $pull: { participantsJoined: identity },
        $addToSet: { webhookEventsProcessed: eventId },
        $set: { updatedAt: new Date() }
      }
    );



    await recordAppointmentAudit({
      clinicId,
      appointmentId: appointmentId,
      action: "PARTICIPANT_DISCONNECTED",
      oldStatus: 'IN_CONSULTATION',
      user: identity.startsWith("doctor-")
        ? { id: identity.replace("doctor-", ""), role: "DOCTOR" }
        : identity.startsWith("patient-")
          ? { id: identity.replace("patient-", ""), role: "PATIENT" }
          : null,
      req: null
    });
  }





  async  roomEnded(appointmentId, eventId, clinicId) {
  try {
    const appt = await Appointment.findOne({ appointmentId });
    if (!appt) return;

    // Idempotency
    if (appt.webhookEventsProcessed?.includes(eventId)) {
      return;
    }

    let finalStatus;

    // ✅ Single source of truth
    if (appt.doctorJoinedAt && appt.patientJoinedAt) {
      finalStatus = "COMPLETED";
    } 
    else if (appt.doctorJoinedAt && !appt.patientJoinedAt) {
      finalStatus = "COMPLETED";
    } 
    else if (appt.patientJoinedAt && !appt.doctorJoinedAt) {
      finalStatus = "NO_SHOW";
    } 
    else {
      finalStatus = "MISSED";
    }

    await Appointment.updateOne(
      { appointmentId },
      {
        $set: {
          status: finalStatus,
          twilioRoomStatus: "COMPLETED",
          callEndedAt: new Date(),
          updatedAt: new Date(),
        },
        $addToSet: {
          webhookEventsProcessed: eventId,
        },
      }
    );

    await recordAppointmentAudit({
      clinicId,
      appointmentId,
      action: "ROOM_ENDED",
      oldStatus: appt.status,
      newStatus: finalStatus,
      user: null,
      req: null,
    });
  } catch (err) {
    console.error("roomEnded error:", err);
  }
}





  /* ==========================================================
   * RECORDING COMPLETED
   * ========================================================== */

  async recordingCompleted(appointmentId, payload, eventId) {
    try {
      const {
        RecordingSid,
        RecordingUrl,
        Duration,
        DateCreated,
        DateUpdated
      } = payload;

      if (!RecordingSid) return;

      // 🔐 Idempotency: same recording dobara insert na ho
      const exists = await Appointment.exists({
        appointmentId,
        "recordings.recordingSid": RecordingSid
      });

      if (exists) {
        return;
      }

      await Appointment.updateOne(
        { appointmentId },
        {
          $push: {
            recordings: {
              recordingSid: RecordingSid,
              recordingUrl: RecordingUrl,
              startedAt: DateCreated ? new Date(DateCreated) : undefined,
              endedAt: DateUpdated ? new Date(DateUpdated) : new Date(),
              durationSeconds: Duration ? Number(Duration) : undefined
            }
          },
          $addToSet: {
            webhookEventsProcessed: eventId
          },
          $set: {
            isRecording: false,
            updatedAt: new Date()
          }
        }
      );

      console.log("✅ Recording stored", {
        appointmentId,
        RecordingSid
      });

    } catch (err) {
      console.error("recordingCompleted error", err);
    }
  }



  /* ==========================================================
   * SAFE EVENT ID GENERATOR
   * ========================================================== */
  _generateEventId(payload, event, roomName) {
    return (
      payload.EventSid ||
      payload.Sid ||
      `${event}-${roomName}-${payload.Timestamp || Date.now()}`
    );
  }
}

export default new TwilioWebhookService();
