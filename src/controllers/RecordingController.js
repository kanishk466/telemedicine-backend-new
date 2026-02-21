// import { log } from "console";
import Appointment from "../models/Appointment.js";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const startRecording = async (req, res) => {
  const { appointmentId } = req.params;

  const appt = await Appointment.findOne({ appointmentId });
  if (!appt || !appt.roomSid) {
    return res.status(404).json({ message: "Room not ready" });
  }

  // 🔐 Idempotency
  if (appt.isRecording) {
    return res.status(200).json({ message: "Recording already running" });
  }

  try {
    await client.video.v1.rooms(appt.roomSid).recordingRules.update({
      rules: [
        { type: "include", all: true },

        { type: "include", kind: "video", track: "screen" },
      ],
    });

    await Appointment.updateOne(
      { appointmentId },
      {
        $set: {
          isRecording: true,
          updatedAt: new Date(),
        },
      }
    );

    return res.json({ message: "Recording started" });
  } catch (err) {
    console.error("startRecording error", err);
    return res.status(500).json({ message: "Failed to start recording" });
  }
};

export const stopRecording = async (req, res) => {
  const { appointmentId } = req.params;

  const appt = await Appointment.findOne({ appointmentId });
  if (!appt || !appt.roomSid) {
    return res.status(404).json({ message: "Room not found" });
  }

  if (!appt.isRecording) {
    return res.status(200).json({ message: "Recording already stopped" });
  }

  try {
    await client.video.v1.rooms(appt.roomSid).recordingRules.update({
      rules: [{ type: "exclude", all: true }],
    }); // ⏹ STOP

    await Appointment.updateOne(
      { appointmentId },
      {
        $set: {
          isRecording: false,
          updatedAt: new Date(),
        },
      }
    );

    return res.json({ message: "Recording stopped" });
  } catch (err) {
    console.error("stopRecording error", err);
    return res.status(500).json({ message: "Failed to stop recording" });
  }
};


export const startCompostion = async ( req , res)=>{
    const { appointmentId } = req.params;

  const appt = await Appointment.findOne({ appointmentId });
  if (!appt || !appt.roomSid) {
    return res.status(404).json({ message: "Room not found" });
  }


  try {
    const composition = await client.video.v1.compositions.create({
    audioSources: ["*"],
    format: "mp4",
    roomSid: appt.roomSid,
    statusCallback: `${process.env.APP_BASE_URL}/api/recording/status-callback`,
    videoLayout: {
      grid: {
        video_sources: ["*"],
      },
    },
  });

  return res.json({message:"Compostion has Started"})
  } catch (error) {
      console.error("stopRecording error", error);
    return res.status(500).json({ message: "Failed to stop recording" });
  }




}