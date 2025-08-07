// server/scripts/migrateTokens.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import TokenMigrationService from '../services/TokenMigrationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
    try {
        console.log('🚀 Starting token migration...');
        
        // Connect to MongoDB
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dyfit';
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');
        
        // Run the migration
        const result = await TokenMigrationService.runCompleteMigration();
        
        console.log('\n📊 Migration Results:');
        console.log(`- Tokens migrated: ${result.tokensMigrated}`);
        console.log(`- Plan tokens generated: ${result.planTokensGenerated}`);
        console.log(`- Total errors: ${result.totalErrors.length}`);
        
        if (result.totalErrors.length > 0) {
            console.log('\n❌ Errors during migration:');
            result.totalErrors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigration();
}

export default runMigration;