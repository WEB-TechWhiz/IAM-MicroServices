import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { app } from "./app.js";  // adjust path if needed
import dbConnect from "./db/index.js";

async function startServer() {
  try {
    await dbConnect();
    const port = process.env.PORT || 8000;
    app.listen(port, () => {
      console.log(`⚙️ Server is running at port: ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}



startServer();
