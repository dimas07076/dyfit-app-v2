// server/scripts/backfill-plan-tokens.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import '../database.js'; // Initialize database connection

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runBackfillPlanTokens() {
    try {
        console.log('🚀 Starting plan token backfill for legacy students...');
        
        // Connect to MongoDB
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dyfit';
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');
        
        // Import models after connection
        const Aluno = (await import('../models/Aluno.js')).default;
        const Token = (await import('../models/Token.js')).default;
        const PersonalPlano = (await import('../models/PersonalPlano.js')).default;
        const PersonalTrainer = (await import('../models/PersonalTrainer.js')).default;
        
        console.log('📊 Analyzing current state...');
        
        // Get all active students
        const activeStudents = await Aluno.find({ status: 'active' });
        console.log(`Found ${activeStudents.length} active students`);
        
        // Get all existing plan tokens 
        const existingPlanTokens = await Token.find({ tipo: 'plano', ativo: true });
        console.log(`Found ${existingPlanTokens.length} existing plan tokens`);
        
        // Create a set of students who already have plan tokens
        const studentsWithPlanTokens = new Set(
            existingPlanTokens
                .filter(token => token.alunoId)
                .map(token => token.alunoId!.toString())
        );
        
        console.log(`${studentsWithPlanTokens.size} students already have plan tokens`);
        
        // Find students without plan tokens
        const studentsNeedingTokens = activeStudents.filter(
            student => !studentsWithPlanTokens.has((student._id as any).toString())
        );
        
        console.log(`${studentsNeedingTokens.length} students need plan tokens`);
        
        if (studentsNeedingTokens.length === 0) {
            console.log('🎉 No students need plan tokens. Backfill complete!');
            return {
                totalStudents: activeStudents.length,
                tokensCreated: 0,
                errors: []
            };
        }
        
        let tokensCreated = 0;
        const errors: string[] = [];
        
        console.log('🔧 Creating plan tokens for students without them...');
        
        for (const student of studentsNeedingTokens) {
            try {
                console.log(`Processing student: ${student.nome} (${student.email})`);
                
                // Get the personal trainer's current plan
                const personalTrainer = await PersonalTrainer.findById(student.trainerId);
                if (!personalTrainer) {
                    const error = `Personal trainer not found for student ${student.nome} (${(student._id as any).toString()})`;
                    console.warn(`⚠️ ${error}`);
                    errors.push(error);
                    continue;
                }
                
                // Get current active plan for this personal trainer
                const currentPlan = await PersonalPlano.findOne({
                    personalTrainerId: student.trainerId,
                    ativo: true,
                    dataVencimento: { $gt: new Date() }
                }).populate('planoId').sort({ dataVencimento: -1 });
                
                if (!currentPlan) {
                    const error = `No active plan found for personal trainer ${personalTrainer.nome} (student: ${student.nome})`;
                    console.warn(`⚠️ ${error}`);
                    errors.push(error);
                    continue;
                }
                
                // Create plan token for this student
                const planToken = new Token({
                    tipo: 'plano',
                    personalTrainerId: student.trainerId,
                    alunoId: student._id as any,
                    planoId: currentPlan._id,
                    dataExpiracao: currentPlan.dataVencimento,
                    ativo: true,
                    quantidade: 1,
                    dateAssigned: new Date(),
                    adicionadoPorAdmin: currentPlan.atribuidoPorAdmin || student.trainerId,
                    motivoAdicao: `Backfill: Token de plano criado para aluno existente - ${(currentPlan.planoId as any)?.nome || 'Plano'}`
                });
                
                await planToken.save();
                tokensCreated++;
                
                console.log(`✅ Created plan token ${planToken.id} for student ${student.nome}`);
                
            } catch (error: any) {
                const errorMsg = `Error creating token for student ${student.nome} (${(student._id as any).toString()}): ${error.message}`;
                console.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
                
                // Check if it's a duplicate key error (student already got a token from concurrent process)
                if ((error as any).code === 11000 && error.message.includes('unique_plan_token_per_student')) {
                    console.log(`ℹ️ Student ${student.nome} already has a plan token (concurrent creation detected)`);
                    continue;
                }
            }
        }
        
        console.log('\n📊 Backfill Summary:');
        console.log(`- Total active students: ${activeStudents.length}`);
        console.log(`- Students already had tokens: ${studentsWithPlanTokens.size}`);
        console.log(`- Students needing tokens: ${studentsNeedingTokens.length}`);
        console.log(`- Plan tokens created: ${tokensCreated}`);
        console.log(`- Errors: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('\n❌ Errors during backfill:');
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        // Final verification
        const finalPlanTokens = await Token.find({ tipo: 'plano', ativo: true });
        const finalStudentsWithTokens = new Set(
            finalPlanTokens
                .filter(token => token.alunoId)
                .map(token => token.alunoId!.toString())
        );
        
        console.log('\n🔍 Final verification:');
        console.log(`- Total plan tokens: ${finalPlanTokens.length}`);
        console.log(`- Students with plan tokens: ${finalStudentsWithTokens.size}`);
        console.log(`- Active students without tokens: ${activeStudents.length - finalStudentsWithTokens.size}`);
        
        if (finalStudentsWithTokens.size === activeStudents.length) {
            console.log('🎉 SUCCESS: All active students now have plan tokens!');
        } else {
            console.log('⚠️ WARNING: Some active students still lack plan tokens (likely due to missing personal trainer plans)');
        }
        
        return {
            totalStudents: activeStudents.length,
            tokensCreated,
            errors
        };
        
    } catch (error) {
        console.error('💥 Backfill failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the backfill if this script is executed directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/^.*\//, '') || '')) {
    runBackfillPlanTokens()
        .then(result => {
            console.log('\n🎉 Backfill completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Backfill failed:', error);
            process.exit(1);
        });
}

export default runBackfillPlanTokens;