import { z } from "zod";
export declare const insertStudentSchema: any;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = InsertStudent & {
    id: number;
};
export declare const insertUserSchema: any;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & {
    id: number;
};
export declare const insertExerciseSchema: any;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = InsertExercise & {
    id: number;
};
export declare const insertWorkoutPlanSchema: any;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = InsertWorkoutPlan & {
    id: number;
};
export declare const insertWorkoutExerciseSchema: any;
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;
export type WorkoutExercise = InsertWorkoutExercise & {
    id: number;
};
export declare const insertStudentWorkoutSchema: any;
export type InsertStudentWorkout = z.infer<typeof insertStudentWorkoutSchema>;
export type StudentWorkout = InsertStudentWorkout & {
    id: number;
};
export declare const insertActivityLogSchema: any;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = InsertActivityLog & {
    id: number;
};
export declare const insertSessionSchema: any;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = InsertSession & {
    id: number;
};
