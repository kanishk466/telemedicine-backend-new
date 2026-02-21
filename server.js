
// import app from "./src/app.js";
// // import ngrok from "@ngrok/ngrok";
// app.listen(process.env.PORT,async () => {
//   if (process.env.NODE_ENV === "development") {
//   console.log("Running in development mode");
// }

// if (process.env.NODE_ENV === "production") {
//   console.log("Running in production mode");
// }

// });
import app from "./src/app.js";
import ngrok from "@ngrok/ngrok";
app.listen(process.env.PORT,async () => {
  console.log("Server running on port 8800");
    try {
    const listener = await ngrok.connect({
      addr: process.env.PORT,
      authtoken: process.env.NGROK_AUTHTOKEN,
      domain: "arlette-uniconoclastic-juanita.ngrok-free.app",
    });
    console.log(`Public URL: ${listener.url()}`);
  } catch (err) {
    console.error("Failed to start ngrok:", err.message);
  }
});