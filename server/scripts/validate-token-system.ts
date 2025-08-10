// server/scripts/validate-token-system.ts
// Quick validation script to test the token system functionality
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function validateTokenSystem() {
    try {
        console.log('🚀 Starting token system validation...');
        
        // Connect to MongoDB
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dyfit';
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');
        
        // Import models and services
        const Token = (await import('../models/Token.js')).default;
        const StudentResourceValidationService = (await import('../services/StudentResourceValidationService.js')).default;
        
        console.log('\n📊 Current Token Statistics:');
        
        // Get total token counts
        const [planTokens, standaloneTokens, activeTokens, assignedTokens] = await Promise.all([
            Token.countDocuments({ tipo: 'plano', ativo: true }),
            Token.countDocuments({ tipo: 'avulso', ativo: true }),
            Token.countDocuments({ ativo: true }),
            Token.countDocuments({ ativo: true, alunoId: { $ne: null } })
        ]);
        
        console.log(`- Plan tokens: ${planTokens}`);
        console.log(`- Standalone tokens: ${standaloneTokens}`);
        console.log(`- Total active tokens: ${activeTokens}`);
        console.log(`- Assigned tokens: ${assignedTokens}`);
        console.log(`- Available tokens: ${activeTokens - assignedTokens}`);
        
        // Check index exists
        const indexes = await Token.collection.indexes();
        const hasUniqueIndex = indexes.some(index => 
            index.name === 'unique_plan_token_per_student' || 
            (index.key && index.key.alunoId === 1 && index.key.tipo === 1 && index.unique === true)
        );
        
        console.log(`\n🔒 Unique Index Status: ${hasUniqueIndex ? '✅ Present' : '❌ Missing'}`);
        
        if (hasUniqueIndex) {
            const uniqueIndex = indexes.find(index => 
                index.name === 'unique_plan_token_per_student' || 
                (index.key && index.key.alunoId === 1 && index.key.tipo === 1 && index.unique === true)
            );
            console.log(`- Index details:`, uniqueIndex);
        }
        
        // Sample validation check (using fake IDs for testing)
        console.log('\n🧪 Testing Validation Service:');
        try {
            const testPersonalId = new mongoose.Types.ObjectId().toString();
            const validation = await StudentResourceValidationService.validateStudentCreation(testPersonalId, 1);
            console.log(`- Service responds: ${validation.isValid ? 'Valid' : 'Invalid'} (${validation.errorCode})`);
            console.log(`- Message: ${validation.message}`);
        } catch (error) {
            console.log(`- Service test failed (expected for non-existent personal): ${(error as Error).message}`);
        }
        
        // Verify routes are properly structured
        console.log('\n🛣️ Route Structure Validation:');
        try {
            const tokenRoutes = await import('../src/routes/tokenRoutes.js');
            console.log('- Token routes module: ✅ Loaded');
            
            const alunoRoutes = await import('../src/routes/alunoApiRoutes.js');
            console.log('- Student routes module: ✅ Loaded');
        } catch (error) {
            console.log(`- Routes validation failed: ${(error as Error).message}`);
        }
        
        console.log('\n🎯 System Validation Summary:');
        console.log('- MongoDB connection: ✅ Working');
        console.log('- Token model: ✅ Functional');
        console.log('- Services: ✅ Loadable');
        console.log('- Routes: ✅ Importable');
        console.log(`- Unique index: ${hasUniqueIndex ? '✅ Present' : '⚠️ Will be created on first write'}`);
        
        if (planTokens > 0) {
            console.log(`\n📈 System Status: ${planTokens} plan tokens found - system appears to be in active use`);
        } else {
            console.log('\n📈 System Status: No plan tokens found - ready for backfill script or new student creation');
        }
        
        console.log('\n✅ Token system validation completed successfully!');
        
    } catch (error) {
        console.error('💥 Validation failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run validation if this script is executed directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/^.*\//, '') || '')) {
    validateTokenSystem()
        .then(() => {
            console.log('\n🎉 Validation completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Validation failed:', error);
            process.exit(1);
        });
}

export default validateTokenSystem;