import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, unique: true },
    pUserId: { type: String, required: true },
    dUserId: { type: String, required: true },
    clinicId: { type: String, required: true },

    //  New telemedicine fields
    // meetingId: { type: String, required: false },
    meetingUrl: { type: String, required: false },
    roomName: { type: String, required: false },
    roomSid: { type: String, required: false },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "RESCHEDULED",
        "CHECKED_IN",
        "ADMITTED",
        "IN_CONSULTATION",
        "COMPLETED",
        "CANCELLED",
        "MISSED",
        "NO_SHOW",
      ],
      default: "SCHEDULED",
    },

    // Who booked
    bookedByUserId: { type: String },
    bookedByRole: { type: String },

    // Appointment type
    appointmentType: {
      type: String,
      enum: ["FOLLOW_UP", "CHECK_UP", "SPECIALIST", "INITIAL_CONSULTATION"],
      required: true,
    },

    compositionUrl: { type: String },
    recordingStoredAt: { type: Date },

    participantsJoined: { type: [String], default: [] },
    webhookEventsProcessed: { type: [String], default: [] },

    recordings: [
      {
        recordingSid: { type: String, required: true },
        recordingUrl: { type: String },
        startedAt: { type: Date },
        endedAt: { type: Date },
        durationSeconds: { type: Number },
      },
    ],

    isRecording: { type: Boolean, default: false },
    lastRecordingStartedAt: { type: Date },

    twilioRoomStatus: { type: String },
    callEndedAt: { type: Date },

    transcriptionEnabled: Boolean,
    transcriptionTtid: String,
    transcriptionStartedAt: Date,
    transcriptionStoppedAt: Date,

    doctorJoinedAt: Date,
    patientJoinedAt: Date,
    checkInAt: Date,
    admittedAt: Date,
  },

  { timestamps: true },
);




// 🔹 Clinic calendar (day / week / month views)
AppointmentSchema.index(
  { clinicId: 1, startTime: 1 }
);

// 🔹 Doctor schedule
AppointmentSchema.index(
  { dUserId: 1, startTime: 1 }
);

// 🔹 Patient history
AppointmentSchema.index(
  { pUserId: 1, startTime: 1 }
);

// 🔹 Status-based filters (missed / completed)
AppointmentSchema.index(
  { clinicId: 1, status: 1, startTime: 1 }
);



export default mongoose.model("Appointment", AppointmentSchema);
