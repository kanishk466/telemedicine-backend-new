import mongoose from "mongoose";

const TranscriptionSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      index: true
    },

    roomSid: {
      type: String,
      required: true,
      index: true
    },

    ttid: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: String,
      enum: ["started", "stopped", "failed"],
      required: true
    },

    transcriptionEngine: {
      type: String,
      enum: ["google", "deepgram"],
      default: "google"
    },

    speechModel: {
      type: String,
      default: "telephony"
    },

    languageCode: {
      type: String,
      default: "en-US"
    },

    startedAt: {
      type: Date
    },

    stoppedAt: {
      type: Date
    },

    durationSeconds: {
      type: Number
    },

    createdBy: {
      type: String, // doctor userId
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "TranscriptionSession",
  TranscriptionSessionSchema
);
