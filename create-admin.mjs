#!/usr/bin/env node
// create-admin.mjs - Create an admin user for testing

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017/dyfit-test';

async function createAdmin() {
    try {
        console.log('🔗 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            dbName: "dyfit-test"
        });
        
        console.log('✅ Conectado ao MongoDB!');

        const personaltrainers = mongoose.connection.collection('personaltrainers');

        // Create an admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const adminUser = {
            _id: new mongoose.Types.ObjectId(),
            nome: 'Admin Teste',
            email: 'admin@test.com',
            passwordHash: hashedPassword,
            role: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Remove existing admin if any
        await personaltrainers.deleteOne({ email: 'admin@test.com' });
        await personaltrainers.insertOne(adminUser);
        
        console.log('✅ Admin criado:', {
            nome: adminUser.nome,
            email: adminUser.email,
            id: adminUser._id
        });
        
        console.log('\n🔑 Use estas credenciais para fazer login:');
        console.log('Email: admin@test.com');
        console.log('Senha: admin123');
        
    } catch (error) {
        console.error('❌ Erro ao criar admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔗 Desconectado do MongoDB');
        process.exit(0);
    }
}

createAdmin();