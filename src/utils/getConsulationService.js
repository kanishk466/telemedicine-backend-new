import Appointment from '../models/Appointment.js';


export const getConsultationMetrics = async (req,res) => {
  const { appointmentId } = req.params;
  // console.log("Fetching consultation metrics for appointmentId:", appointmentId);
  const appt = await Appointment.findOne({ appointmentId }).lean();
  if (!appt) return null;


  return res.json({
    consultationDurationSec:  calculateConsultationDuration(appt),
    patientWaitTimeSec:  calculatePatientWaitTime(appt),
    doctorWaitTimeSec:  calculateDoctorWaitTime(appt),
    earlyEnded: isEarlyEnded(appt),
    status: appt.status
  });
  // return {
  //   consultationDurationSec: calculateConsultationDuration(appt),
  //   patientWaitTimeSec: calculatePatientWaitTime(appt),
  //   doctorWaitTimeSec: calculateDoctorWaitTime(appt),
  //   earlyEnded: isEarlyEnded(appt),
  //   status: appt.status
  // };
};


function calculateConsultationDuration(appt) {
// console.log("calculate consulation duration " , appt.doctorJoinedAt , appt.patientJoinedAt , appt.callEndedAt);


  if (!appt.doctorJoinedAt && !appt.patientJoinedAt && !appt.callEndedAt) {
    return 0; // incomplete consultation
  }

  const start = Math.max(
    new Date(appt.doctorJoinedAt).getTime(),
    new Date(appt.patientJoinedAt).getTime()
  );

  const end = new Date(appt.callEndedAt).getTime();

  return Math.max(0, Math.floor((end - start) / 1000)); // seconds
}





// function calculatePatientWaitTime(appt) {
//   if (!appt.patientJoinedAt || !appt.doctorJoinedAt) return null;

//   return Math.max(
//     0,
//     Math.floor(
//       (new Date(appt.doctorJoinedAt) - new Date(appt.patientJoinedAt)) / 1000
//     )
//   );
// }


function calculatePatientWaitTime(appt) {
  const patientStart = appt.checkInAt || appt.startTime;
  if (!patientStart || !appt.doctorJoinedAt) return 0;

  return Math.max(
    0,
    Math.floor(
      (new Date(appt.doctorJoinedAt) - new Date(patientStart)) / 1000
    )
  );
}



// function calculateDoctorWaitTime(appt) {
//   if (!appt.doctorJoinedAt || !appt.patientJoinedAt) return null;

//   return Math.max(
//     0,
//     Math.floor(
//       (new Date(appt.patientJoinedAt) - new Date(appt.doctorJoinedAt)) / 1000
//     )
//   );
// }

function calculateDoctorWaitTime(appt) {
  if (!appt.doctorJoinedAt) return 0;

  const patientTime = appt.patientJoinedAt || appt.startTime;
  if (!patientTime) return 0;

  return Math.max(
    0,
    Math.floor(
      (new Date(patientTime) - new Date(appt.doctorJoinedAt)) / 1000
    )
  );
}



function isEarlyEnded(appt) {
  if (!appt.callEndedAt || !appt.startTime) return 0;

  const scheduledDuration =
    (new Date(appt.endTime) - new Date(appt.startTime)) / 1000;

  const actualDuration = calculateConsultationDuration(appt);

  return actualDuration !== null && actualDuration < scheduledDuration * 0.5;
}
