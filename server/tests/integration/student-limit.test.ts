// server/tests/integration/student-limit.test.ts
// Simple integration test for student limit validation
// This test validates the core functionality without requiring Jest/Mocha setup

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import database connection
import '../../database.js';

// Simple test runner for integration testing
export class StudentLimitIntegrationTest {
    private testPersonalTrainerId: string = '';
    private testPlanId: string = '';
    
    // Import models
    private PersonalTrainer: any;
    private Plano: any;
    private PersonalPlano: any;
    private Aluno: any;
    private Token: any;
    private StudentResourceValidationService: any;
    
    async setup() {
        console.log('🚀 Setting up Student Limit Integration Test...');
        
        // Connect to test database
        const mongoUrl = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || 'mongodb://localhost:27017/dyfit-test';
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to test database');
        
        // Import models after connection
        this.PersonalTrainer = (await import('../../models/PersonalTrainer.js')).default;
        this.Plano = (await import('../../models/Plano.js')).default;
        this.PersonalPlano = (await import('../../models/PersonalPlano.js')).default;
        this.Aluno = (await import('../../models/Aluno.js')).default;
        this.Token = (await import('../../models/Token.js')).default;
        this.StudentResourceValidationService = (await import('../../services/StudentResourceValidationService.js')).default;
    }
    
    async setupTestData() {
        console.log('📊 Setting up test data...');
        
        // Clean up any existing test data
        await this.PersonalTrainer.deleteMany({ email: /test.*@dyfit\.test/ });
        await this.Plano.deleteMany({ nome: /Test.*Plan/ });
        await this.PersonalPlano.deleteMany({});
        await this.Aluno.deleteMany({ email: /test.*@dyfit\.test/ });
        await this.Token.deleteMany({ motivoAdicao: /Test/ });
        
        // Create test personal trainer
        const personalTrainer = new this.PersonalTrainer({
            nome: 'Test Personal',
            email: 'test.personal@dyfit.test',
            passwordHash: 'test-hash',
            role: 'personal'
        });
        await personalTrainer.save();
        this.testPersonalTrainerId = personalTrainer._id.toString();
        
        // Create Free plan (limit: 1 student)
        const freePlan = new this.Plano({
            nome: 'Test Free Plan',
            limiteAlunos: 1,
            preco: 0,
            ativo: true
        });
        await freePlan.save();
        
        // Assign Free plan to personal trainer
        const personalPlan = new this.PersonalPlano({
            personalTrainerId: this.testPersonalTrainerId,
            planoId: freePlan._id,
            dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            ativo: true,
            atribuidoPorAdmin: this.testPersonalTrainerId
        });
        await personalPlan.save();
        this.testPlanId = personalPlan._id.toString();
        
        console.log(`✅ Test data setup complete. Personal ID: ${this.testPersonalTrainerId}, Plan ID: ${this.testPlanId}`);
    }
    
    async testCanCreateFirstStudentOnFreePlan() {
        console.log('\n🧪 Test: Can create first student on Free plan');
        
        // Validate that we can create 1 student
        const validation = await this.StudentResourceValidationService.validateStudentCreation(
            this.testPersonalTrainerId,
            1
        );
        
        this.assert(validation.isValid === true, 'Should be able to create first student');
        this.assert(validation.status.availableSlots >= 1, 'Should have available slots');
        this.assert(validation.resourceType === 'plan', 'Should use plan resource type');
        
        // Create the first student
        const student1 = new this.Aluno({
            nome: 'Test Student 1',
            email: 'test.student1@dyfit.test',
            passwordHash: 'test-hash',
            trainerId: this.testPersonalTrainerId,
            status: 'active'
        });
        await student1.save();
        const testStudent1Id = student1._id.toString();
        
        // Assign resource to student
        const assignment = await this.StudentResourceValidationService.assignResourceToStudent(
            this.testPersonalTrainerId,
            testStudent1Id
        );
        
        this.assert(assignment.success === true, 'Assignment should succeed');
        this.assert(assignment.resourceType === 'plan', 'Should assign plan resource');
        
        // Verify plan token was created
        const planToken = await this.Token.findOne({
            alunoId: testStudent1Id,
            tipo: 'plano',
            ativo: true
        });
        
        this.assert(planToken !== null, 'Plan token should be created');
        this.assert(planToken.personalTrainerId.toString() === this.testPersonalTrainerId, 'Token should belong to personal trainer');
        this.assert(planToken.planoId.toString() === this.testPlanId, 'Token should be linked to plan');
        
        console.log('✅ Test passed: Can create first student on Free plan');
        return testStudent1Id;
    }
    
    async testCannotCreateSecondStudentOnFreePlan(firstStudentId: string) {
        console.log('\n🧪 Test: Cannot create second student on Free plan');
        
        // Now try to validate creating a second student
        const validation = await this.StudentResourceValidationService.validateStudentCreation(
            this.testPersonalTrainerId,
            1
        );
        
        this.assert(validation.isValid === false, 'Should not be able to create second student');
        this.assert(validation.errorCode === 'INSUFFICIENT_RESOURCES', 'Should have insufficient resources error');
        this.assert(validation.status.availableSlots === 0, 'Should have no available slots');
        this.assert(validation.message.includes('recursos disponíveis'), 'Should mention available resources');
        
        // Verify that the validation shows the plan is at capacity
        this.assert(validation.status.planInfo !== null, 'Should have plan info');
        this.assert(validation.status.planInfo!.planSlotsAvailable === 0, 'Plan should have no available slots');
        this.assert(validation.status.planInfo!.planSlotsUsed === 1, 'Plan should show 1 slot used');
        
        console.log('✅ Test passed: Cannot create second student on Free plan');
    }
    
    async testIdempotentTokenAssignment() {
        console.log('\n🧪 Test: Idempotent token assignment (no duplicates)');
        
        // Create a student
        const student = new this.Aluno({
            nome: 'Test Student Idempotent',
            email: 'test.student.idempotent@dyfit.test',
            passwordHash: 'test-hash',
            trainerId: this.testPersonalTrainerId,
            status: 'active'
        });
        await student.save();
        const studentId = student._id.toString();
        
        // First assignment should succeed
        const assignment1 = await this.StudentResourceValidationService.assignResourceToStudent(
            this.testPersonalTrainerId,
            studentId
        );
        this.assert(assignment1.success === true, 'First assignment should succeed');
        
        // Verify one plan token exists
        let planTokens = await this.Token.find({
            alunoId: studentId,
            tipo: 'plano',
            ativo: true
        });
        this.assert(planTokens.length === 1, 'Should have exactly one plan token after first assignment');
        
        // Second assignment attempt should not create duplicate (idempotency)
        const assignment2 = await this.StudentResourceValidationService.assignResourceToStudent(
            this.testPersonalTrainerId,
            studentId
        );
        this.assert(assignment2.success === true, 'Second assignment should succeed but not create duplicate');
        
        // Verify still only one plan token exists
        planTokens = await this.Token.find({
            alunoId: studentId,
            tipo: 'plano',
            ativo: true
        });
        this.assert(planTokens.length === 1, 'Should still have exactly one plan token after second assignment');
        
        console.log('✅ Test passed: Idempotent token assignment');
    }
    
    async testStudentDeactivationKeepsTokenAssigned() {
        console.log('\n🧪 Test: Student deactivation keeps token assigned');
        
        // Create and assign student
        const student = new this.Aluno({
            nome: 'Test Student Deactivation',
            email: 'test.student.deactivation@dyfit.test',
            passwordHash: 'test-hash',
            trainerId: this.testPersonalTrainerId,
            status: 'active'
        });
        await student.save();
        const studentId = student._id.toString();
        
        await this.StudentResourceValidationService.assignResourceToStudent(
            this.testPersonalTrainerId,
            studentId
        );
        
        // Verify student has plan token
        let planToken = await this.Token.findOne({
            alunoId: studentId,
            tipo: 'plano',
            ativo: true
        });
        this.assert(planToken !== null, 'Student should have plan token before deactivation');
        
        // Deactivate student
        student.status = 'inactive';
        await student.save();
        
        // Token should still be assigned (permanent assignment)
        planToken = await this.Token.findOne({
            alunoId: studentId,
            tipo: 'plano',
            ativo: true
        });
        this.assert(planToken !== null, 'Token should still exist after deactivation');
        this.assert(planToken!.alunoId.toString() === studentId, 'Token should still be assigned to student');
        
        // Available slots should still be 0 (token remains consumed)
        const validation = await this.StudentResourceValidationService.validateStudentCreation(
            this.testPersonalTrainerId,
            1
        );
        this.assert(validation.status.availableSlots === 0, 'Available slots should remain 0 after deactivation');
        
        console.log('✅ Test passed: Student deactivation keeps token assigned');
    }
    
    async cleanup() {
        console.log('\n🧹 Cleaning up test data...');
        
        // Clean up test data
        await this.PersonalTrainer.deleteMany({ email: /test.*@dyfit\.test/ });
        await this.Plano.deleteMany({ nome: /Test.*Plan/ });
        await this.PersonalPlano.deleteMany({});
        await this.Aluno.deleteMany({ email: /test.*@dyfit\.test/ });
        await this.Token.deleteMany({ motivoAdicao: /Test/ });
        
        await mongoose.disconnect();
        console.log('✅ Cleanup complete and disconnected from database');
    }
    
    assert(condition: boolean, message: string) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    async runAllTests() {
        try {
            await this.setup();
            await this.setupTestData();
            
            // Test 1: Can create first student
            const firstStudentId = await this.testCanCreateFirstStudentOnFreePlan();
            
            // Reset for next test
            await this.setupTestData();
            
            // Test 2: Cannot create second student
            const student1 = new this.Aluno({
                nome: 'Test Student 1',
                email: 'test.student1@dyfit.test',
                passwordHash: 'test-hash',
                trainerId: this.testPersonalTrainerId,
                status: 'active'
            });
            await student1.save();
            await this.StudentResourceValidationService.assignResourceToStudent(
                this.testPersonalTrainerId,
                student1._id.toString()
            );
            await this.testCannotCreateSecondStudentOnFreePlan(student1._id.toString());
            
            // Reset for next test
            await this.setupTestData();
            
            // Test 3: Idempotent assignment
            await this.testIdempotentTokenAssignment();
            
            // Reset for next test
            await this.setupTestData();
            
            // Test 4: Deactivation keeps token
            await this.testStudentDeactivationKeepsTokenAssigned();
            
            console.log('\n🎉 All tests passed successfully!');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/^.*\//, '') || '')) {
    const test = new StudentLimitIntegrationTest();
    test.runAllTests()
        .then(() => {
            console.log('\n✅ Integration tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Integration tests failed:', error);
            process.exit(1);
        });
}

export default StudentLimitIntegrationTest;