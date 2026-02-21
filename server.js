
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
});
