import { createServer as createViteServer } from "vite";
import { Express } from "express";
import { Server } from "http";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  return vite.middlewares;
}

export function serveStatic() {
  return (req: any, res: any, next: any) => next();
}

export function log(message: string) {
  console.log(message);
}
