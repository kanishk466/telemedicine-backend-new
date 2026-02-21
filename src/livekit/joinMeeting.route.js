import router from "express"
import { joinMeeting } from "../livekit/joinMeeting.controller.js";
const joinMeetingRouter = router.Router();

joinMeetingRouter.post("/join-meeting", joinMeeting);

export default joinMeetingRouter;