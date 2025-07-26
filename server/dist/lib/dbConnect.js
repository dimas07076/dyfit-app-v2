import mongoose from 'mongoose';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI no seu .env ou na Vercel');
}
/**
 * Cache de conexão global. Isso evita criar uma nova conexão a cada
 * invocação da função serverless em um "warm start".
 */
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
async function dbConnect() {
    if (cached.conn) {
        // Se já temos uma conexão em cache, a reutilizamos.
        console.log('=> Usando conexão de banco de dados em cache');
        return cached.conn;
    }
    if (!cached.promise) {
        // Se não há uma conexão em cache, criamos uma nova.
        const opts = {
            bufferCommands: false, // Desabilitar o buffer é uma boa prática em serverless
        };
        console.log('=> Criando NOVA conexão com o banco de dados');
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
export default dbConnect;
