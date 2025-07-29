import { z } from "zod";
export declare const insertStudentSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    birthDate: z.ZodString;
    gender: z.ZodString;
    goal: z.ZodString;
    weight: z.ZodNumber;
    height: z.ZodNumber;
    startDate: z.ZodString;
    trainerId: z.ZodNumber;
    status: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    email: string;
    birthDate: string;
    gender: string;
    goal: string;
    weight: number;
    height: number;
    startDate: string;
    trainerId: number;
    phone?: string | undefined;
    status?: string | undefined;
    notes?: string | undefined;
}, {
    nome: string;
    email: string;
    birthDate: string;
    gender: string;
    goal: string;
    weight: number;
    height: number;
    startDate: string;
    trainerId: number;
    phone?: string | undefined;
    status?: string | undefined;
    notes?: string | undefined;
}>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = InsertStudent & {
    id: number;
};
export declare const insertUserSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    role: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
}, {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
}>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & {
    id: number;
};
export declare const insertExerciseSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    muscleGroup: z.ZodString;
    category: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    muscleGroup: string;
    category: string;
    description?: string | undefined;
}, {
    name: string;
    muscleGroup: string;
    category: string;
    description?: string | undefined;
}>;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = InsertExercise & {
    id: number;
};
export declare const insertWorkoutPlanSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    trainerId: z.ZodNumber;
    status: z.ZodString;
}, "strip", z.ZodTypeAny, {
    trainerId: number;
    status: string;
    name: string;
    description?: string | undefined;
}, {
    trainerId: number;
    status: string;
    name: string;
    description?: string | undefined;
}>;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = InsertWorkoutPlan & {
    id: number;
};
export declare const insertWorkoutExerciseSchema: z.ZodObject<{
    workoutPlanId: z.ZodNumber;
    exerciseId: z.ZodNumber;
    sets: z.ZodNumber;
    reps: z.ZodNumber;
    rest: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    grupoCombinado: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    workoutPlanId: number;
    exerciseId: number;
    sets: number;
    reps: number;
    rest: number;
    order: number;
    notes?: string | undefined;
    grupoCombinado?: string | null | undefined;
}, {
    workoutPlanId: number;
    exerciseId: number;
    sets: number;
    reps: number;
    rest: number;
    notes?: string | undefined;
    order?: number | undefined;
    grupoCombinado?: string | null | undefined;
}>;
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;
export type WorkoutExercise = InsertWorkoutExercise & {
    id: number;
};
export declare const insertStudentWorkoutSchema: z.ZodObject<{
    studentId: z.ZodNumber;
    workoutPlanId: z.ZodNumber;
    progress: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    workoutPlanId: number;
    studentId: number;
    progress?: number | undefined;
}, {
    workoutPlanId: number;
    studentId: number;
    progress?: number | undefined;
}>;
export type InsertStudentWorkout = z.infer<typeof insertStudentWorkoutSchema>;
export type StudentWorkout = InsertStudentWorkout & {
    id: number;
};
export declare const insertActivityLogSchema: z.ZodObject<{
    trainerId: z.ZodNumber;
    activityType: z.ZodString;
    details: z.ZodAny;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    trainerId: number;
    activityType: string;
    timestamp: Date;
    details?: any;
}, {
    trainerId: number;
    activityType: string;
    timestamp: Date;
    details?: any;
}>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = InsertActivityLog & {
    id: number;
};
export declare const insertSessionSchema: z.ZodObject<{
    trainerId: z.ZodNumber;
    studentId: z.ZodNumber;
    sessionDate: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    status: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    trainerId: number;
    status: string;
    studentId: number;
    sessionDate: string;
    startTime: string;
    endTime: string;
    notes?: string | undefined;
}, {
    trainerId: number;
    status: string;
    studentId: number;
    sessionDate: string;
    startTime: string;
    endTime: string;
    notes?: string | undefined;
}>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = InsertSession & {
    id: number;
};
