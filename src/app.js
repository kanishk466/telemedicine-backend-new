import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import twilioWebhookRouter from "./routes/twilio.webhook.js";
import twilioRoomRoutes from "./routes/twilioRoom.routes.js";
import meetRoutes from "./routes/meet.routes.js"
import transcriptionRoutes from "./routes/transcription.routes.js"
import liveKitRoutes from "./livekit/joinMeeting.route.js"

import { configDotenv } from "dotenv";

import { errorHandler } from "./utils/errorHandler.js";

const app = express();
configDotenv();
app.use(express.json());

app.use(cors());

connectDB();

// Routes
app.use("/api/appointment", appointmentRoutes);
app.use("/api", userRoutes);
app.use("/", twilioWebhookRouter);
app.use("/api/meet", meetRoutes)
app.use("/api/twilio", twilioRoomRoutes);
app.use("/api/twilio/v1" ,transcriptionRoutes)
app.use("/api/livekit", liveKitRoutes);






// app.post("/api/recording/status-callback", (req, res) => {
//   console.log("🔥 COMPOSITION CALLBACK HIT", req.body);
//   res.status(200).send("OK");
// });

app.get("/ping", (req, res) => {
  res.json({ status: "running" });
});







app.use(errorHandler);
export default app;
