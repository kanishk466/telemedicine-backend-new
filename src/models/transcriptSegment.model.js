import mongoose from "mongoose";

const TranscriptSegmentSchema = new mongoose.Schema(
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
      index: true
    },

    participantSid: {
      type: String,
      required: true
    },

    speakerRole: {
      type: String,
      enum: ["DOCTOR", "PATIENT", "UNKNOWN"],
      required: true
    },

    trackSid: {
      type: String
    },

    sequenceNumber: {
      type: Number,
      required: true
    },

    text: {
      type: String,
      required: true
    },

    languageCode: {
      type: String,
      default: "en-US"
    },

    spokenAt: {
      type: Date,
      required: true
    },

    receivedAt: {
      type: Date,
      default: Date.now
    },

    confidence: {
      type: Number // from stability (optional)
    }
  },
  {
    timestamps: true
  }
);

/**
 * Prevent duplicates if events are retried
 */
TranscriptSegmentSchema.index(
  { roomSid: 1, sequenceNumber: 1 },
  { unique: true }
);

export default mongoose.model(
  "TranscriptSegment",
  TranscriptSegmentSchema
);
