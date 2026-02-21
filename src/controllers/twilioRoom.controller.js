import twilioRoomService from "../services/twilioRoom.service.js";
import ciService from "../services/ci.service.js";

class TwilioRoomController {
  /* ---------------------------------------------------------
   * GET /twilio/rooms/:sid
   * Fetch Room Details
   * --------------------------------------------------------- */
  async getRoomDetails(req, res) {
    try {
      const { sid } = req.params;
      const room = await twilioRoomService.getRoomDetails(sid);
      return res.json({ success: true, data: room });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ---------------------------------------------------------
   * GET /twilio/rooms/:sid/participants
   * Fetch all participants of a room
   * --------------------------------------------------------- */
  async getRoomParticipants(req, res) {
    try {
      const { sid } = req.params;
      const participants = await twilioRoomService.getRoomParticipants(sid);
      return res.json({ success: true, data: participants });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ---------------------------------------------------------
   * GET /twilio/rooms/:sid/recordings
   * Fetch all recordings of a room
   * --------------------------------------------------------- */
  // async getRoomRecordings(req, res) {
  //   try {
  //     const { sid } = req.params;
  //     const recordings = await twilioRoomService.getRoomRecordings(sid);
  //     return res.json({ success: true, data: recordings });
  //   } catch (err) {
  //     return res.status(500).json({ success: false, message: err.message });
  //   }
  // }





/* ---------------------------------------------------------
 * GET /twilio/rooms/:sid/recordings
 * Fetch filtered audio recordings of a room
 * --------------------------------------------------------- */
async  getRoomRecordings(req, res) {
  try {
    const { sid } = req.params;

    if (!sid || !sid.startsWith("RM")) {
      return res.status(400).json({
        success: false,
        message: "Invalid RoomSid"
      });
    }

    const recordings = await twilioRoomService.getRoomRecordings(sid);

    return res.json({
      success: true,
      count: recordings.length,
      data: recordings
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}



  /* ---------------------------------------------------------
   * GET /twilio/recordings/:sid/download
   * Fetch recording download URL
   * --------------------------------------------------------- */
  async downloadRecording(req, res) {
    try {
      const { sid } = req.params;
      const url = await twilioRoomService.getRecordingDownloadUrl(sid);
      return res.json({ success: true, downloadUrl: url });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ---------------------------------------------------------
   * GET /twilio/rooms/:sid/transcriptions
   * Fetch transcriptions of a room
   * --------------------------------------------------------- */
  async getRoomTranscriptions(req, res) {
    try {
      const { sid } = req.params;
      const transcripts = await twilioRoomService.getRoomTranscriptions(sid);
      return res.json({ success: true, data: transcripts });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ---------------------------------------------------------
   * PATCH /twilio/rooms/:sid/recording-rules
   * Update room recording rules
   * --------------------------------------------------------- */
  async updateRecordingRules(req, res) {
    try {
      const { sid } = req.params;
      const { rules } = req.body;

      if (!rules) {
        return res.status(400).json({
          success: false,
          message: "rules array is required",
        });
      }

      const updated = await twilioRoomService.updateRecordingRules(sid, rules);
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }





async  sendRoomAudiosToCI(req, res) {
  const { sid: roomSid } = req.params;

  // console.log("sid:", roomSid);
  

  const audios = await twilioRoomService.getRoomRecordings(roomSid);

  // console.log("audios" , audios);
  

  const ciJobs = await ciService.submitRoomAudiosToCI(audios);

  res.json({
    success: true,
    submitted: ciJobs.length,
    data: ciJobs
  });
}



}

export default new TwilioRoomController();
