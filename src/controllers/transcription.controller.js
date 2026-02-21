import { TranscriptionService } from '../services/transcription.service.js';
import TranscriptSegment from "../models/transcriptSegment.model.js";

import { AppError } from '../utils/error.js';

export class TranscriptionController {
  constructor() {
    this.transcriptionService = new TranscriptionService();
  }






  // startTranscription = async (req, res, next) => {
  //   try {
  //     const { roomSid } = req.params;
  //     const {
  //       languageCode = 'en-US',
  //       partialResults = true,
  //       profanityFilter = true,
  //       speechModel = 'telephony',
  //       transcriptionEngine = 'google',
  //       hints,
  //       enableAutomaticPunctuation = true

  //     } = req.body;

  //     if (!roomSid || !roomSid.startsWith('RM')) {
  //       throw new AppError('Invalid room SID format', 400);
  //     }

  //     console.log('Starting transcription', { roomSid, languageCode });

  //     const transcription =
  //       await this.transcriptionService.startTranscription({
  //         roomSid,
  //         configuration: {
  //           languageCode,
  //           partialResults,
  //           profanityFilter,
  //           speechModel,
  //           transcriptionEngine,
  //           hints,
  //           enableAutomaticPunctuation
  //         }
  //       });

  //     res.status(201).json({
  //       success: true,
  //       data: transcription,
  //       message: 'Transcription started successfully'
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };








  // ingestTranscript = async (req, res, next) => {
  //   try {
  //     const {
  //       appointmentId,
  //       roomSid,
  //       ttid,
  //       participantSid,
  //       speakerRole,
  //       trackSid,
  //       sequenceNumber,
  //       text,
  //       languageCode,
  //       spokenAt,
  //       isFinal,
  //       stability
  //     } = req.body;

  //     // 1️⃣ Hard validation
  //     if (!isFinal || stability < 0.9) {
  //       return res.status(202).json({ ignored: true });
  //     }

  //     if (!roomSid?.startsWith("RM")) {
  //       throw new AppError("Invalid Room SID", 400);
  //     }

  //     // 2️⃣ Insert (idempotent due to unique index)
  //     await TranscriptSegment.create({
  //       appointmentId,
  //       roomSid,
  //       ttid,
  //       participantSid,
  //       speakerRole,
  //       trackSid,
  //       sequenceNumber,
  //       text,
  //       languageCode,
  //       spokenAt,
  //       confidence: stability
  //     });

  //     res.status(201).json({ success: true });
  //   } catch (err) {
  //     // Duplicate sequenceNumber → safe ignore
  //     if (err.code === 11000) {
  //       return res.status(200).json({ duplicate: true });
  //     }
  //     next(err);
  //   }
  // };





ingestTranscriptBatch = async (req, res, next) => {
  try {
    const { appointmentId, roomSid, ttid, segments } = req.body;

    // 🔒 Basic validation
    if (!appointmentId || !roomSid || !ttid) {
      throw new AppError("Missing required identifiers", 400);
    }

    if (!roomSid.startsWith("RM")) {
      throw new AppError("Invalid Room SID", 400);
    }

    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(200).json({ ignored: true });
    }

    // 🧹 Sanitize & prepare docs
    const docs = segments.map((s) => ({
      appointmentId,
      roomSid,
      ttid,
      participantSid: s.participantSid,
      speakerRole: s.speakerRole || "UNKNOWN",
      trackSid: s.trackSid,
      sequenceNumber: s.sequenceNumber,
      text: s.text,
      languageCode: s.languageCode || "en-US",
      spokenAt: new Date(s.spokenAt),
      confidence: s.confidence
    }));

    /**
     * 🔥 insertMany with ordered:false
     * - skips duplicates
     * - continues on errors
     */
    await TranscriptSegment.insertMany(docs, {
      ordered: false
    });

    res.status(201).json({
      success: true,
      inserted: docs.length
    });
  } catch (err) {
    /**
     * Duplicate key errors (sequenceNumber uniqueness)
     * are EXPECTED in retries — ignore safely
     */
    if (err.code === 11000) {
      return res.status(200).json({
        success: true,
        duplicateIgnored: true
      });
    }

    next(err);
  }
};


  startTranscription = async (req, res, next) => {
    try {
      const { roomSid } = req.params;

      if (!roomSid || !roomSid.startsWith('RM')) {
        throw new AppError('Invalid room SID format', 400);
      }

      // console.log('Starting transcription', { roomSid });

      const transcription =
        await this.transcriptionService.startTranscription({
          roomSid,
          configuration: {
            languageCode: 'en-US',


            partialResults: false,

            profanityFilter: true,
            speechModel: 'telephony',
            transcriptionEngine: 'google',
            enableAutomaticPunctuation: true,

          }
        });

      res.status(201).json({
        success: true,
        data: transcription,
        message: 'Transcription started successfully'
      });
    } catch (error) {
      console.log("Error in startTranscription:", error);
      next(error);
    }
  };


  stopTranscription = async (req, res, next) => {
    try {
      // console.log("snflsnmm stop transcription called")
      const { roomSid, ttid } = req.params;

      if (!roomSid?.startsWith('RM')) {
        throw new AppError('Invalid room SID format', 400);
      }

      if (!ttid?.startsWith('video_extension_')) {
        throw new AppError('Invalid transcription TTID format', 400);
      }

      // console.log('Stopping transcription', { roomSid, ttid });

      const transcription =
        await this.transcriptionService.stopTranscription(roomSid, ttid);

      res.status(200).json({
        success: true,
        data: transcription,
        message: 'Transcription stopped successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  getTranscription = async (req, res, next) => {
    try {
      const { roomSid, ttid } = req.params;

      if (!roomSid?.startsWith('RM')) {
        throw new AppError('Invalid room SID format', 400);
      }

      const transcription = ttid
        ? await this.transcriptionService.getTranscription(roomSid, ttid)
        : await this.transcriptionService.listTranscriptions(roomSid);

      res.status(200).json({
        success: true,
        data: transcription
      });
    } catch (error) {
      next(error);
    }
  };

  restartTranscription = async (req, res, next) => {
    try {
      const { roomSid, ttid } = req.params;

      if (!roomSid?.startsWith('RM')) {
        throw new AppError('Invalid room SID format', 400);
      }

      if (!ttid?.startsWith('video_extension_')) {
        throw new AppError('Invalid transcription TTID format', 400);
      }

      // console.log('Restarting transcription', { roomSid, ttid });

      const transcription =
        await this.transcriptionService.restartTranscription(roomSid, ttid);

      res.status(200).json({
        success: true,
        data: transcription,
        message: 'Transcription restarted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
