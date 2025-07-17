// server/middlewares/authenticateAlunoToken.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

// Este middleware agora apenas VERIFICA se um aluno está autenticado
// A autenticação em si é feita pelo 'authenticateToken' geral
export const authenticateAlunoToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // O middleware 'authenticateToken' já deve ter sido executado
  // e populado req.aluno se o token for válido.
  if (req.aluno && req.aluno.role === 'aluno') {
    // Log para confirmar que o aluno foi autenticado corretamente
    console.log(`[AUTH ALUNO] Aluno verificado: ${req.aluno?.email || req.aluno.id}`);
    return next(); // Aluno está autenticado, prossiga.
  }

  // Se req.aluno não existir ou a role for incorreta, o acesso é negado.
  // Isso pode acontecer se o token for de um personal ou se não houver token.
  console.warn(`[AUTH ALUNO] Tentativa de acesso não autorizada a uma rota de aluno.`);
  return res.status(403).json({ message: 'Acesso proibido. Esta rota é exclusiva para alunos.' });
};