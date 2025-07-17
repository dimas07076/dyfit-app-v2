// src/shared/schema.ts

import { z } from "zod";

// Aluno (Student)
export const insertStudentSchema = z.object({
  nome: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  birthDate: z.string(),
  gender: z.string(),
  goal: z.string(),
  weight: z.number(),
  height: z.number(),
  startDate: z.string(),
  trainerId: z.number(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
// Adicionando o tipo 'Student' que inclui o ID
export type Student = InsertStudent & { id: number };


// Usuário (User)
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  role: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: number };


// Exercício (Exercise)
export const insertExerciseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  muscleGroup: z.string(),
  category: z.string(),
});
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = InsertExercise & { id: number };


// Plano de treino (Workout Plan)
export const insertWorkoutPlanSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  trainerId: z.number(),
  status: z.string(),
});
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = InsertWorkoutPlan & { id: number };


// Exercício dentro de um plano (Workout Exercise)
export const insertWorkoutExerciseSchema = z.object({
  workoutPlanId: z.number(),
  exerciseId: z.number(),
  sets: z.number(),
  reps: z.number(),
  rest: z.number(),
  notes: z.string().optional(),
  // Adicionando um campo de ordem que seu storage.ts usa
  order: z.number().optional().default(0),
});
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;
export type WorkoutExercise = InsertWorkoutExercise & { id: number };


// Relacionamento aluno <-> treino (Student Workout)
export const insertStudentWorkoutSchema = z.object({
  studentId: z.number(),
  workoutPlanId: z.number(),
  progress: z.number().optional(),
});
export type InsertStudentWorkout = z.infer<typeof insertStudentWorkoutSchema>;
export type StudentWorkout = InsertStudentWorkout & { id: number };


// Registro de atividade (Activity Log)
export const insertActivityLogSchema = z.object({
  trainerId: z.number(),
  activityType: z.string(),
  details: z.any(),
  timestamp: z.date(),
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = InsertActivityLog & { id: number };


// Sessão (Session)
export const insertSessionSchema = z.object({
  trainerId: z.number(),
  studentId: z.number(),
  sessionDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  notes: z.string().optional(),
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = InsertSession & { id: number };