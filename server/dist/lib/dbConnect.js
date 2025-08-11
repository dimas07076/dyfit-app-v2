// server/lib/dbConnect.ts
import mongoose from 'mongoose';
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
async function dbConnect() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error('ERRO CRÍTICO: A variável MONGODB_URI não foi encontrada no momento da chamada de dbConnect().');
        throw new Error('Por favor, defina a variável de ambiente MONGODB_URI no seu .env ou na Vercel');
    }
    if (cached.conn) {
        console.log('=> Usando conexão de banco de dados em cache');
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            dbName: "dyfit",
        };
        console.log('=> Criando NOVA conexão com o banco de dados');
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
            mongoose.connection.on('error', (err) => {
                console.error("❌ Erro na conexão com MongoDB:", err);
            });
            mongoose.connection.on('disconnected', () => {
                console.log("ℹ️  Desconectado do MongoDB.");
            });
            return mongoose;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        console.error('❌ Erro ao conectar ao MongoDB:', e);
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
export default dbConnect;
