import Appointment from "../models/Appointment.js";

export async function handleLiveKitWebhook(req, res) {
  try {
    const event = req.body;
    console.log("LiveKit Webhook Event:", event);

    const eventType = event.event;
    const identity = event.participant?.identity;
    const roomName = event.room?.name;
    const eventId = event.id; // unique webhook ID
    console.log(`[DEBUG] Event Type: ${eventType}, Identity: ${identity}, Room: ${roomName}, EventId: ${eventId}`);

    if (!identity || !roomName) {
      console.log("[DEBUG] Missing identity or roomName - ignoring event");
      return res.status(200).send("Ignored");
    }

    // identity = appointmentId:userId:role
    const [appointmentId, userId, role] = identity.split(":");
    console.log(`[DEBUG] Parsed Identity - AppointmentId: ${appointmentId}, UserId: ${userId}, Role: ${role}`);

    if (!appointmentId || !role) {
      console.log("[DEBUG] Invalid identity format - missing appointmentId or role");
      return res.status(200).send("Invalid identity");
    }

    const appt = await Appointment.findOne({ appointmentId });
    console.log(`[DEBUG] Appointment lookup result:`, appt ? `Found (ID: ${appt.appointmentId})` : "Not found");
    if (!appt) {
      console.log(`[DEBUG] Appointment not found for appointmentId: ${appointmentId}`);
      return res.status(200).send("Appointment not found");
    }

    /* -----------------------------------------
     * Idempotency check (VERY IMPORTANT)
     * ----------------------------------------- */
    const isDuplicate = appt.webhookEventsProcessed?.includes(eventId);
    console.log(`[DEBUG] Idempotency check - EventId ${eventId} already processed: ${isDuplicate}`);
    if (isDuplicate) {
      console.log("[DEBUG] Duplicate event detected - skipping");
      return res.status(200).send("Duplicate event");
    }

    /* -----------------------------------------
     * participant_joined
     * ----------------------------------------- */
    if (eventType === "participant_joined") {
      console.log(`[DEBUG] participant_joined event for ${role}`);
      if (role === "doctor" && !appt.doctorJoinedAt) {
        console.log("[DEBUG] Doctor joined - setting doctorJoinedAt");
        appt.doctorJoinedAt = new Date();
      }

      if (role === "patient" && !appt.patientJoinedAt) {
        console.log("[DEBUG] Patient joined - setting patientJoinedAt");
        appt.patientJoinedAt = new Date();
      }

      if (!appt.participantsJoined.includes(identity)) {
        console.log(`[DEBUG] Adding participant to participantsJoined: ${identity}`);
        appt.participantsJoined.push(identity);
      } else {
        console.log(`[DEBUG] Participant already in participantsJoined: ${identity}`);
      }
    }

    /* -----------------------------------------
     * participant_left
     * ----------------------------------------- */
    if (eventType === "participant_left") {
      console.log(`[DEBUG] participant_left event for ${role}`);
      // Optional: future logic
      // Example:
      // doctor left → auto end consultation
      // patient left → mark early exit
    }

    // Mark webhook processed
    console.log(`[DEBUG] Marking event ${eventId} as processed`);
    appt.webhookEventsProcessed.push(eventId);
    await appt.save();
    console.log("[DEBUG] Appointment updated successfully");

    return res.status(200).send("OK");
  } catch (err) {
    console.error("[DEBUG] LiveKit webhook error:", err);
    console.error("[DEBUG] Error stack:", err.stack);
    return res.status(200).send("Error ignored");
  }
}
