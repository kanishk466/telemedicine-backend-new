/**
 * AppointmentAudit Model
 *
 * This model defines the schema for storing audit history of appointments in the telemedicine application.
 * The primary purpose of this audit trail is to maintain a comprehensive record of all changes made to appointments,
 * including who performed the action, what changed, when it happened, and additional context like IP address and user agent.
 *
 * Main thinking behind storing audit history:
 * - **Compliance and Regulatory Requirements**: Healthcare applications often need to comply with regulations like HIPAA,
 *   which require tracking access and modifications to patient data.
 * - **Accountability and Security**: By logging who made changes and when, we can trace back actions for security audits,
 *   detect unauthorized access, and hold users accountable.
 * - **Debugging and Troubleshooting**: Audit logs help in identifying issues, understanding the sequence of events,
 *   and reconstructing the state of appointments at any point in time.
 * - **Data Integrity**: Immutable timestamps ensure that audit entries cannot be altered after creation,
 *   providing a reliable historical record.
 * - **Analytics and Reporting**: Aggregated audit data can be used for reporting on system usage, user behavior,
 *   and appointment lifecycle management.
 *
 * Each audit entry captures a specific action on an appointment, storing both the old and new states where applicable,
 * along with metadata for additional context.
 */

import mongoose from "mongoose";

const AppointmentAuditSchema = new mongoose.Schema({
  // The unique identifier of the appointment being audited. This field is indexed for efficient querying.
  appointmentId: {
    type: String,
    required: true,
    index: true
  },

  clinicId: { type: String, required: true },
  // The type of action performed on the appointment (e.g., CREATE_APPOINTMENT, STATUS_UPDATE, CANCEL, etc.).
  // This helps categorize the audit entry and understand what operation was executed.
  action: {
    type: String,
    required: true
    // e.g. CREATE_APPOINTMENT, STATUS_UPDATE
  },

  // The previous status of the appointment before the action was performed.
  // Useful for tracking state transitions and understanding what changed.
  oldStatus: {
    type: String,
    default: null
  },

  // The new status of the appointment after the action was performed.
  // Combined with oldStatus, this shows the exact change that occurred.
  newStatus: {
    type: String,
    default: null
  },

  // The ID of the user who performed the action. Can be null for system-initiated actions.
  // Links to the User model for identifying the actor.
  performedByUserId: {
    type: String,
    default: null
  },

  // The role of the user who performed the action. Defaults to "SYSTEM" for automated processes.
  // Helps in access control analysis and understanding the context of the action.
  performedByRole: {
    type: String,
    enum: ["DOCTOR", "PATIENT", "FRONTOFFICE", "SYSTEM"],
    default: "SYSTEM"
  },

  // Additional metadata related to the action, stored as a flexible object.
  // Can include details like reason for change, additional parameters, or custom fields.
  metadata: {
    type: Object,
    default: {}
  },

  // The IP address from which the action was initiated. Useful for security monitoring and geolocation.
  ipAddress: String,

  // The user agent string from the client's browser or device. Helps identify the client type and version.
  userAgent: String,

  // The timestamp when the audit entry was created. This field is immutable to prevent tampering.
  // Essential for chronological ordering and ensuring the integrity of the audit trail.
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true // 🔒 VERY IMPORTANT
  }
});

export default mongoose.model("AppointmentAudit", AppointmentAuditSchema);
