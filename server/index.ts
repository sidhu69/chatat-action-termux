import express, { type Express } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

(async () => {
  const server = await registerRoutes(app);
  app.use(await setupVite(app, server));
  app.use(serveStatic());

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();
