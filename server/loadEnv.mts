// server/loadEnv.mts (ou server/loadEnv.ts)

// Usamos 'require' para dotenv porque este arquivo será carregado como CommonJS
const dotenv = require('dotenv');
const path = require('path');

// No CommonJS, __dirname e __filename estão disponíveis globalmente
// e apontam para o diretório e nome do arquivo atual, respectivamente.
// Não precisamos de 'fileURLToPath' ou 'import.meta.url' aqui.

// Look for .env file in the parent directory (project root)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });