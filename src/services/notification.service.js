import { sendEmail } from "./email.service.js";

// export async function sendAppointmentCreatedEmail(data) {
//   const html = `
//     <h2>📅 Appointment Confirmed</h2>
//     <p>Hi ${data.patientName},</p>

//     <p>Your appointment has been successfully scheduled.</p>

//     <ul>
//       <li><strong>Date:</strong> ${data.date}</li>
//       <li><strong>Time:</strong> ${data.time}</li>
//       <li><strong>Doctor:</strong> ${data.doctorName}</li>
//     </ul>

//     <p>Join your video consultation using the link below:</p>

//     <p>
//       <a href="${data.joinUrl}" target="_blank"
//         style="background:#2563eb;color:#fff;padding:12px 20px;
//         text-decoration:none;border-radius:6px;display:inline-block;">
//         Join Video Consultation
//       </a>
//     </p>

//     <p>Thanks,<br/>Team</p>
//   `;

//   return sendEmail({
//     to: data.email,
//     subject: "Appointment Confirmed – Join Video Consultation",
//     text: `Your appointment is confirmed. Join: ${data.joinUrl}`,
//     html
//   });
// }


// Appointment Created
export async function sendAppointmentCreatedEmail(data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;"> Appointment Confirmed</h2>
      <p>Hi ${data.patientName},</p>
      <p>Your appointment has been successfully scheduled.</p>
      <ul>
        <li><strong>Date:</strong> ${data.date}</li>
        <li><strong>Time:</strong> ${data.time}</li>
        <li><strong>Doctor:</strong> ${data.doctorName}</li>
      </ul>
      <p>Join your video consultation using the link below:</p>
      <a href="${data.joinUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Join Video Consultation</a>
      <p>Thanks,<br>Team</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: "Appointment Confirmed – Join Video Consultation",
    text: `Your appointment is confirmed. Date: ${data.date}, Time: ${data.time}, Doctor: ${data.doctorName}. Join: ${data.joinUrl}`,
    html
  });
}

// Appointment Rescheduled
export async function sendAppointmentRescheduledEmail(data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;"> Appointment Rescheduled</h2>
      <p>Hi ${data.patientName},</p>
      <p>Your appointment has been rescheduled to a new date and time.</p>
      <h3>New Appointment Details:</h3>
      <ul>
        <li><strong>Date:</strong> ${data.newDate}</li>
        <li><strong>Time:</strong> ${data.newTime}</li>
        <li><strong>Doctor:</strong> ${data.doctorName}</li>
      </ul>
      ${data.previousDate ? `
      <h3>Previous Appointment:</h3>
      <ul>
        <li><strong>Date:</strong> ${data.previousDate}</li>
        <li><strong>Time:</strong> ${data.previousTime}</li>
      </ul>
      ` : ''}
      <p>Join your video consultation using the link below:</p>
      <a href="${data.joinUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Join Video Consultation</a>
      <p>Thanks,<br>Team</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: "Appointment Rescheduled",
    text: `Your appointment has been rescheduled. New Date: ${data.newDate}, New Time: ${data.newTime}, Doctor: ${data.doctorName}. Join: ${data.joinUrl}`,
    html
  });
}

// Consultation Completed
export async function sendConsultationCompletedEmail(data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Consultation Completed</h2>
      <p>Hi ${data.patientName},</p>
      <p>Thank you for attending your consultation with ${data.doctorName}.</p>
      <h3>Consultation Summary:</h3>
      <ul>
        <li><strong>Date:</strong> ${data.date}</li>
        <li><strong>Time:</strong> ${data.time}</li>
        <li><strong>Doctor:</strong> ${data.doctorName}</li>
        <li><strong>Duration:</strong> ${data.duration || 'N/A'}</li>
      </ul>
      ${data.prescriptionUrl ? `
      <p>Your prescription is ready:</p>
      <a href="${data.prescriptionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Prescription</a>
      ` : ''}
      ${data.followUpDate ? `
      <p><strong>Follow-up Appointment:</strong> ${data.followUpDate}</p>
      ` : ''}
      <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
      <p>Thanks,<br>Team</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: "Consultation Completed – Summary & Next Steps",
    text: `Your consultation with ${data.doctorName} on ${data.date} at ${data.time} has been completed. ${data.prescriptionUrl ? `View prescription: ${data.prescriptionUrl}` : ''}`,
    html
  });
}

// Appointment Cancelled
export async function sendAppointmentCancelledEmail(data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;"> Appointment Cancelled</h2>
      <p>Hi ${data.patientName},</p>
      <p>Your appointment has been cancelled.</p>
      <h3>Cancelled Appointment:</h3>
      <ul>
        <li><strong>Date:</strong> ${data.date}</li>
        <li><strong>Time:</strong> ${data.time}</li>
        <li><strong>Doctor:</strong> ${data.doctorName}</li>
      </ul>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p>If you'd like to schedule a new appointment, please contact us.</p>
      <p>Thanks,<br>Team</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: "Appointment Cancelled",
    text: `Your appointment on ${data.date} at ${data.time} with ${data.doctorName} has been cancelled.`,
    html
  });
}

// Appointment Reminder (24 hours before)
export async function sendAppointmentReminderEmail(data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8b5cf6;"> Appointment Reminder</h2>
      <p>Hi ${data.patientName},</p>
      <p>This is a friendly reminder about your upcoming appointment.</p>
      <ul>
        <li><strong>Date:</strong> ${data.date}</li>
        <li><strong>Time:</strong> ${data.time}</li>
        <li><strong>Doctor:</strong> ${data.doctorName}</li>
      </ul>
      <p>Please ensure you're ready to join the video consultation at the scheduled time:</p>
      <a href="${data.joinUrl}" style="display: inline-block; padding: 12px 24px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Join Video Consultation</a>
      <p>Need to reschedule? <a href="${data.rescheduleUrl || '#'}" style="color: #2563eb;">Click here</a></p>
      <p>Thanks,<br>Team</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: "Reminder: Your Appointment Tomorrow",
    text: `Reminder: Your appointment with ${data.doctorName} is scheduled for ${data.date} at ${data.time}. Join: ${data.joinUrl}`,
    html
  });
}