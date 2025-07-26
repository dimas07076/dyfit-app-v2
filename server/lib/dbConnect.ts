import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Por favor, defina a variável de ambiente MONGODB_URI no seu .env ou na Vercel');
}

/**
 * Cache de conexão global. Isso evita criar uma nova conexão a cada
 * invocação da função serverless em um "warm start".
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
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
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      dbName: "dyfit", // Specify database name
    };

    console.log('=> Criando NOVA conexão com o banco de dados');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
      
      // Add event listeners for better error handling
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
  } catch (e) {
    console.error('❌ Erro ao conectar ao MongoDB:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;