// routes/twilioWebhook.route.js
import express from "express";
import TelemedicineWebhookService from "../services/telemedicineWebhook.service.js";
import {handleLiveKitWebhook} from "../livekit/livekit.webhook.controller.js";

const router = express.Router();

// router.post(
//   "/twilio/webhook", express.urlencoded({ extended: true }),
//   async (req, res) => {
//     console.log("\n🔥 TWILIO WEBHOOK HIT 🔥");
//     console.log("Headers:", req.headers);
//     console.log("Body:", req.body);

//     try {
//       await TelemedicineWebhookService.handle(req.body);
//       return res.status(200).send("OK");
//     } catch (err) {
//       console.error("Webhook error:", err);
//       return res.status(500).json({ error: "Server error" });
//     }
//   }
// );


router.post(
  "/twilio/webhook", express.urlencoded({ extended: true }),
  async (req, res) => {
    // console.log("Headers:", req.headers);
    // console.log("Body:", req.body);

     try {
    await TelemedicineWebhookService.handle(req.body);
    res.status(200).send("OK");
  } catch (err) {
    logger.error("Twilio Webhook Controller Error", err);
    res.status(500).send("Webhook Error");
  }
  }
);

router.post("/api/livekit/webhook", handleLiveKitWebhook);


router.post("/api/recording/status-callback",express.urlencoded({ extended: true }), async (req, res) => {

  // console.log("Composition webhook callled" , req)
  const {
    CompositionSid,
    StatusCallbackEvent,
    MediaUri,
    RoomSid,
    Duration
  } = req.body;
  


  // console.log("Recording Status Callback received:", req.body);

  if (StatusCallbackEvent === "composition-available") {
    const mediaUrl = `https://video.twilio.com${MediaUri}`;

    await Appointment.updateOne(
      { roomSid: RoomSid },
      {
        $set: {
          compositionUrl: mediaUrl,
          recordingStoredAt: new Date()
        }
      }
    );
  }

  res.sendStatus(200);
});



router.post('/webhooks/transcription' ,express.urlencoded({ extended: true }), async(req, res)=>{
  try {

    // Twilio sends form-encoded OR JSON (depends on config)
      // console.log("🔥 TRANSCRIPTION WEBHOOK HIT");
    const payload = req.body;

  // console.log("payload" , payload);
  
    // console.log(JSON.stringify(payload, null, 2));

    /**
     * Expected fields (Twilio):
     * RoomSid
     * ParticipantIdentity
     * Transcript
     * IsPartial
     */

    const {
      RoomSid,
      ParticipantIdentity,
      Transcript,
      IsPartial
    } = payload;

    if (!RoomSid || !Transcript) {
      // Twilio sometimes sends non-text events
      return res.sendStatus(200);
    }

    // ✅ For now just log (we'll store later)
    console.table("📝 Transcription text", {
      roomSid: RoomSid,
      speaker: ParticipantIdentity,
      text: Transcript,
      isPartial: IsPartial
    });

    // IMPORTANT: Always respond 200 quickly
    res.sendStatus(200);
  } catch (err) {
    // logger.error("❌ Transcription webhook error", err);
    res.sendStatus(500);
  }
})
 







export default router;
