export function errorHandler(err, req, res, next) {
    console.error("❌ Erro capturado pelo middleware:", err.stack);
    const statusCode = err.statusCode || 500;
    const response = {
        sucesso: false,
        mensagem: err.message || "Erro interno no servidor.",
        ...(process.env.NODE_ENV === "development" && { detalhes: err.stack }),
    };
    res.status(statusCode).json(response);
}
