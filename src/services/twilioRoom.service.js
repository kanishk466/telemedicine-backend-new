import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_API_KEY,
  process.env.TWILIO_API_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);




class TwilioRoomService {
  
  /* ---------------------------------------------------
   * 1. Get Twilio Room Details
   * --------------------------------------------------- */





  async getRoomDetails(roomSid) {
    try {
      const room = await client.video.v1.rooms(roomSid).fetch();
      return room;
    } catch (err) {
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 2. List Participants of Room
   * --------------------------------------------------- */
  async getRoomParticipants(roomSid) {
    try {
      const participants = await client.video.v1.rooms(roomSid).participants.list();
      return participants;
    } catch (err) {
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 3. Get All Recordings of a Room
   * --------------------------------------------------- */
  // async getRoomRecordings(roomSid) {
  //   try {
  //     const recordings = await client.video.v1.recordings.list({
  //       groupingSid: [roomSid]
  //     });

  //     return recordings;
  //   } catch (err) {
  //     throw err;
  //   }
  // }






async  getRoomRecordings(roomSid) {
  // 1. Fetch all recordings of the room
  const recordings = await client.video.v1.recordings.list({
    groupingSid: [roomSid]
  });

  // 2. Keep only audio recordings
  const audioOnly = recordings.filter(
    (rec) => rec.type === "audio"
  );

  // 3. Remove very short / empty audio (< 3 sec)
  const validDuration = audioOnly.filter(
    (rec) => Number(rec.duration) >= 3
  );

  // 4. Remove redundant audio
  // Rule: one participant → one longest audio
  const participantMap = new Map();

  for (const rec of validDuration) {
    // Fallback if participantSid is missing
    const participantKey = rec.participantSid || rec.sid;

    if (!participantMap.has(participantKey)) {
      participantMap.set(participantKey, rec);
    } else {
      const existing = participantMap.get(participantKey);
      if (Number(rec.duration) > Number(existing.duration)) {
        participantMap.set(participantKey, rec);
      }
    }
  }

  // 5. Final clean list
  return Array.from(participantMap.values());
}


  /* ---------------------------------------------------
   * 4. Get Direct Download URL for a Recording
   * --------------------------------------------------- */
  async getRecordingDownloadUrl(recordingSid) {
    try {
      const media = await client.video.v1.recordings(recordingSid).media.fetch();

      return media.redirectTo; // Twilio generates a temporary signed URL
    } catch (err) {
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 5. Get Recording Rules
   * --------------------------------------------------- */
  async getRecordingRules(roomSid) {
    try {
      const rules = await client.video.v1.rooms(roomSid).recordingRules().fetch();
      return rules;
    } catch (err) {
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 6. Update Recording Rules
   * --------------------------------------------------- */
  async updateRecordingRules(roomSid, rules) {
    try {
      const updated = await client.video.v1.rooms(roomSid)
        .recordingRules()
        .update({ rules });

      return updated;
    } catch (err) {
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 7. Fetch Transcriptions
   * --------------------------------------------------- */
  async getRoomTranscriptions(roomSid) {
    try {
      const transcriptions = await client.video.v1.rooms(roomSid)
        .transcriptions
        .list();

      return transcriptions;
    } catch (err) {
      throw err;
    }
  }












  /* ---------------------------------------------------
   * 1. Create CI Conversation
   * --------------------------------------------------- */
  async createConversation(roomSid) {
    return client.intelligence.v2.conversations.create({
      friendlyName: `Room-${roomSid}`
    });
  }

  /* ---------------------------------------------------
   * 2. Get Filtered Audio Recordings of Room
   * --------------------------------------------------- */
  async getRoomRecordings(roomSid) {
    const recordings = await client.video.v1.recordings.list({
      groupingSid: [roomSid]
    });

    const audioOnly = recordings.filter(
      (rec) => rec.type === "audio" && Number(rec.duration) >= 3
    );

    // one participant → one longest audio
    const participantMap = new Map();

    for (const rec of audioOnly) {
      const key = rec.participantSid || rec.sid;

      if (
        !participantMap.has(key) ||
        Number(rec.duration) > Number(participantMap.get(key).duration)
      ) {
        participantMap.set(key, rec);
      }
    }

    return Array.from(participantMap.values());
  }





}

export default new TwilioRoomService();
