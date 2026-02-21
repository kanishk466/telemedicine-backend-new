import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class CIService {

  /**
   * Submit ONE audio recording to Conversational Intelligence
   */
  async createTranscriptFromRecording(recordingSid) {
    console.log("Creating transcript for recordingSid:", recordingSid);
    return client.intelligence.v2.transcripts.create({
      channel: {
        media: {
          recordingSid:recordingSid
        }
      }
    });
  }

  /**
   * Submit MULTIPLE filtered audios to CI
   */
  async submitRoomAudiosToCI(filteredAudios) {
    const results = [];
    console.log("filteredAudios" , filteredAudios);
    

    for (const audio of filteredAudios) {
      const transcript = await this.createTranscriptFromRecording(audio.sid);
      console.log("Transcript" , transcript);
      
      results.push({
        recordingSid: audio.sid,
        transcriptSid: transcript.sid,
        status: transcript.status
      });
    }

    return results;
  }
}

export default new CIService();
