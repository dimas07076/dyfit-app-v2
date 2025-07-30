// server/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string; // Adicionado código de erro específico
}

// Função para categorizar erros comuns
const categorizeError = (err: AppError): { status: number; message: string; code: string } => {
  // Erros do MongoDB/Mongoose
  if (err.name === 'ValidationError') {
    return {
      status: 400,
      message: 'Dados fornecidos são inválidos.',
      code: 'VALIDATION_ERROR'
    };
  }
  
  if (err.name === 'CastError') {
    return {
      status: 400,
      message: 'ID fornecido é inválido.',
      code: 'INVALID_ID'
    };
  }
  
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    return {
      status: 409,
      message: 'Dados duplicados. Este registro já existe.',
      code: 'DUPLICATE_ERROR'
    };
  }
  
  // Erros de conexão com banco
  if (err.name === 'MongoNetworkError' || err.message?.includes('connection')) {
    return {
      status: 503,
      message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
      code: 'SERVICE_UNAVAILABLE'
    };
  }
  
  // Erros de autenticação JWT
  if (err.name === 'JsonWebTokenError') {
    return {
      status: 401,
      message: 'Token de acesso inválido.',
      code: 'INVALID_TOKEN'
    };
  }
  
  if (err.name === 'TokenExpiredError') {
    return {
      status: 401,
      message: 'Sessão expirada. Faça login novamente.',
      code: 'TOKEN_EXPIRED'
    };
  }
  
  // Erros operacionais conhecidos
  if (err.isOperational) {
    return {
      status: err.statusCode || 500,
      message: err.message,
      code: err.code || 'OPERATIONAL_ERROR'
    };
  }
  
  // Erro genérico
  return {
    status: err.statusCode || 500,
    message: err.message || 'Erro interno no servidor.',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  };
};

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("❌ Erro capturado pelo middleware:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const { status, message, code } = categorizeError(err);
  
  const response = {
    sucesso: false,
    message: message,
    code: code,
    ...(process.env.NODE_ENV === "development" && { 
      detalhes: err.stack,
      originalError: err.name 
    }),
  };

  res.status(status).json(response);
}
