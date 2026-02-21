import { Router } from 'express';
import { body, param } from 'express-validator';
import { TranscriptionController } from '../controllers/transcription.controller.js';
import { validateRequest } from '../middleware/validator.js';

const router = Router();
const controller = new TranscriptionController();

const startValidation = [
  param('roomSid').matches(/^RM[a-f0-9]{32}$/),
  body('languageCode').optional().isString(),
  body('partialResults').optional().isBoolean(),
  body('profanityFilter').optional().isBoolean(),
  body('speechModel').optional().isString(),
  body('transcriptionEngine').optional().isIn(['google', 'deepgram']),
  body('hints').optional().isString(),
  body('enableAutomaticPunctuation').optional().isBoolean()
];

const paramsValidation = [
  param('roomSid').matches(/^RM[a-f0-9]{32}$/),
  param('ttid').matches(/^video_extension_[a-f0-9-]{36}$/)
];

router.post(
  '/rooms/:roomSid/transcriptions',
  startValidation,
  validateRequest,
  controller.startTranscription
);

router.post(
  '/rooms/:roomSid/transcriptions/:ttid/stop',
  paramsValidation,
  validateRequest,
  controller.stopTranscription
);

router.post(
  '/rooms/:roomSid/transcriptions/:ttid/restart',
  paramsValidation,
  validateRequest,
  controller.restartTranscription
);

router.get(
  '/rooms/:roomSid/transcriptions/:ttid',
  param('roomSid').matches(/^RM[a-f0-9]{32}$/),
  validateRequest,
  controller.getTranscription
);

router.post('/transcriptions/ingest/batch' , controller.ingestTranscriptBatch);



export default router;
