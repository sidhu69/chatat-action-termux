import { createServer as createViteServer } from "vite";
import { Express, Request, Response, NextFunction } from "express";
import { Server } from "http";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  
  return vite.middlewares;
}

export function serveStatic() {
  return (req: Request, res: Response, next: NextFunction) => next();
}

export function log(message: string) {
  console.log(message);
}
