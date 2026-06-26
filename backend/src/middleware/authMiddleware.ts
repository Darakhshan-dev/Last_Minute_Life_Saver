import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const userId = authHeader.split("Bearer ")[1];
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: Invalid token format" });
  }

  req.userId = userId;
  next();
}
