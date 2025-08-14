// server/middlewares/authenticateAdmin.ts
import { Request, Response, NextFunction } from "express";
import { authenticateToken } from "./authenticateToken.js";

/**
 * Este middleware garante que o usuário esteja autenticado e possua o papel de administrador.
 * Assuma que `req.user.role` é preenchido pelo authenticateToken.
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  authenticateToken(req, res, (err?: any) => {
    if (err) {
      return; // authenticateToken já tratou a resposta
    }
    const user = (req as any).user;
    if (!user || (user.role !== "admin" && user.role !== "administrator")) {
      return res.status(403).json({ message: "Acesso negado. Somente administradores podem realizar esta ação." });
    }
    next();
  });
}
