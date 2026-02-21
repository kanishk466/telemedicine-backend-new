/**
 * Audit Service
 *
 * This service provides utility functions for recording audit trails in the telemedicine application.
 * It acts as an abstraction layer over the audit models, making it easy to log changes and actions
 * across the system in a consistent manner.
 *
 * The main purpose is to centralize audit logging logic, ensuring that all audit entries are created
 * with the necessary context (user, request details, metadata) and follow the same structure.
 * This promotes consistency, reduces code duplication, and makes it easier to modify audit behavior
 * in the future (e.g., adding additional logging, validation, or async processing).
 *
 * By using this service, controllers and other parts of the application can easily record audit events
 * without directly interacting with the database models, maintaining separation of concerns.
 */

import AppointmentAudit from "../models/AppointmentAudit.js";

/**
 * Records an audit entry for an appointment action.
 *
 * This function creates a new audit log entry whenever an action is performed on an appointment.
 * It captures essential information about the change, including who performed it, what changed,
 * and contextual details from the request.
 *
 * @param {Object} params - The parameters for the audit entry
 * @param {string} params.appointmentId - The ID of the appointment being audited
 * @param {string} params.action - The type of action performed (e.g., 'CREATE_APPOINTMENT', 'STATUS_UPDATE')
 * @param {string} [params.oldStatus=null] - The previous status of the appointment (if applicable)
 * @param {string} [params.newStatus=null] - The new status of the appointment (if applicable)
 * @param {Object} [params.user] - The user who performed the action (with id and role properties)
 * @param {Object} [params.req] - The HTTP request object (used to extract IP and user agent)
 * @param {Object} [params.metadata={}] - Additional metadata to store with the audit entry
 *
 * @returns {Promise<void>} - Resolves when the audit entry is successfully created
 *
 * @example
 * await recordAppointmentAudit({
 *   appointmentId: '12345',
 *   action: 'STATUS_UPDATE',
 *   oldStatus: 'SCHEDULED',
 *   newStatus: 'COMPLETED',
 *   user: { id: 'user123', role: 'DOCTOR' },
 *   req: requestObject,
 *   metadata: { reason: 'Patient completed consultation' }
 * });
 */
export async function recordAppointmentAudit({
  clinicId,
  appointmentId,
  action,
  oldStatus = null,
  newStatus = null,
  user,
  req,
  metadata = {}
}) {
  // Create a new audit entry in the database using the AppointmentAudit model
  // This captures all the provided information along with automatically generated timestamp
  await AppointmentAudit.create({
    clinicId,
    appointmentId,          // Links the audit to the specific appointment
    action,                 // Describes what type of action was performed
    oldStatus,              // Previous state (null if not applicable, e.g., for creation)
    newStatus,              // New state after the action
    performedByUserId: user?.id || null,        // ID of the user who performed the action
    performedByRole: user?.role || "SYSTEM",    // Role of the user (defaults to SYSTEM for automated actions)
    ipAddress: req?.ip,                          // IP address from the request for security tracking
    userAgent: req?.headers?.["user-agent"],     // User agent string for device/browser identification
    metadata                                 // Additional flexible data for context-specific information
  });
}



export const getAppointmentAudits = async (req, res) => {
  try {
    const {
      clinicId,
      appointmentId,
      action,
      oldStatus,
      newStatus,
      performedByRole,
      performedByUserId,
      fromDate,
      toDate,
      page = 1,
      limit = 10
    } = req.query;

    /* -----------------------------
     * Build filter object
     * ----------------------------- */
    const filter = {};
    if (clinicId) filter.clinicId = clinicId;

    if (appointmentId) filter.appointmentId = appointmentId;
    if (action) filter.action = action;
    if (oldStatus) filter.oldStatus = oldStatus;
    if (newStatus) filter.newStatus = newStatus;
    if (performedByRole) filter.performedByRole = performedByRole;
    if (performedByUserId) filter.performedByUserId = performedByUserId;

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    /* -----------------------------
     * Pagination
     * ----------------------------- */
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.min(Number(limit), 100);
    const skip = (pageNumber - 1) * pageSize;

    /* -----------------------------
     * Query DB
     * ----------------------------- */
    const [data, total] = await Promise.all([
      AppointmentAudit.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      AppointmentAudit.countDocuments(filter)
    ]);

    /* -----------------------------
     * Response
     * ----------------------------- */
    res.json({
      success: true,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalRecords: total,
        totalPages: Math.ceil(total / pageSize)
      },
      data
    });
  } catch (error) {
    console.error("Fetch audit logs failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch appointment audit logs"
    });
  }
};

