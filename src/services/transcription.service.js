import axios from 'axios';
import { AppError } from '../utils/error.js';
import { circuitBreaker } from '../middleware/circuit-breaker.js';
import { log } from 'console';

export class TranscriptionService {
  constructor() {
    this.baseUrl = 'https://video.twilio.com/v1';
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.accountSid,
        password: this.authToken
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
    
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;



      switch (status) {
        case 400:
          throw new AppError(data?.message || 'Invalid request', 400);
        case 401:
          throw new AppError('Invalid Twilio credentials', 401);
        case 404:
          throw new AppError('Room or transcription not found', 404);
        case 429:
          throw new AppError('Rate limit exceeded', 429);
        case 500:
        case 502:
        case 503:
        case 504:
          throw new AppError('Twilio service unavailable', 503);
        default:
          throw new AppError(data?.message || 'Twilio API error', status);
      }
    }

    throw new AppError('Unable to reach Twilio', 503);
  }

  async startTranscription({ roomSid, configuration }) {
    return circuitBreaker.execute(async () => {
      const formData = new URLSearchParams();
      formData.append('Configuration', JSON.stringify(configuration));

      const response = await this.client.post(
        `/Rooms/${roomSid}/Transcriptions`,
        formData
      );



      return response.data;
    });
  }

  async stopTranscription(roomSid, ttid) {
    return circuitBreaker.execute(async () => {
      const formData = new URLSearchParams();
      formData.append('Status', 'stopped');

      const response = await this.client.post(
        `/Rooms/${roomSid}/Transcriptions/${ttid}`,
        formData
      );

      return response.data;
    });
  }

  async restartTranscription(roomSid, ttid) {

    console.log("snflsnmm restart transcription called" , {roomSid , ttid});
    return circuitBreaker.execute(async () => {

      const formData = new URLSearchParams();
      // console.log("snflsnmm before appending status" , formData);
      // console.log("snflsnmm appending status started",   formData.append('Status', 'started'))
      formData.append('Status', 'started');
      // log("snflsnmm after appending status" , formData.toString());

      const response = await this.client.post(
        `/Rooms/${roomSid}/Transcriptions/${ttid}`,
       formData.toString()
      );

      console.log("response" , response);
      

      return response.data;
    });
  }


//   async restartTranscription(roomSid, ttid) {

//   const formData = new URLSearchParams();
//   formData.append('Status', 'started');

//   const response = await this.client.post(
//     `/Rooms/${roomSid}/Transcriptions/${ttid}`,
//     formData.toString()
//   );

//   console.log("response" , response);
  

//   return response.data;
// }

  async getTranscription(roomSid, ttid) {
    return circuitBreaker.execute(async () => {
      const response = await this.client.get(
        `/Rooms/${roomSid}/Transcriptions/${ttid}`
      );
      return response.data;
    });
  }

  async listTranscriptions(roomSid) {
    return circuitBreaker.execute(async () => {
      const response = await this.client.get(
        `/Rooms/${roomSid}/Transcriptions`
      );
      return response.data;
    });
  }
}
