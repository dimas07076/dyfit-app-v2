// server/loadEnv.mts
const dotenv = require('dotenv');
const path = require('path');
// O diretório de trabalho atual (CWD) quando você executa 'npm run dev'
// é a raiz do projeto.
const projectRoot = process.cwd();
// Construímos o caminho absoluto para o arquivo .env dentro da pasta /server
const envPath = path.resolve(projectRoot, 'server', '.env');
// Log de depuração para verificar o caminho que está sendo usado
console.log(`[loadEnv] Tentando carregar variáveis de ambiente do arquivo: ${envPath}`);
// Carrega o arquivo .env do caminho especificado
const result = dotenv.config({ path: envPath });
// Verifica se o carregamento teve sucesso ou falhou
if (result.error) {
    console.error('[loadEnv] ERRO CRÍTICO AO TENTAR CARREGAR O ARQUIVO .env:', result.error);
}
else if (Object.keys(result.parsed || {}).length > 0) {
    console.log('[loadEnv] Variáveis de ambiente foram carregadas com sucesso.');
    // Log de confirmação para a variável específica do MongoDB
    console.log(`[loadEnv] Variável MONGODB_URI foi encontrada? ${!!result.parsed.MONGODB_URI}`);
}
else {
    console.warn('[loadEnv] ATENÇÃO: O arquivo .env foi encontrado, mas está vazio ou não pôde ser lido.');
}
export {};
