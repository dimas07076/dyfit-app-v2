// client/src/pages/combined-exercise-demo.tsx
import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2, Link as LinkIcon, Unlink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration
const mockExercises = [
  {
    id: 1,
    exerciseId: 101,
    sets: 3,
    reps: 12,
    rest: 90,
    order: 1,
    grupoCombinado: null,
    exercise: { name: "Push-ups", muscleGroup: "Chest" }
  },
  {
    id: 2,
    exerciseId: 102,
    sets: 3,
    reps: 10,
    rest: 60,
    order: 2,
    grupoCombinado: "combo-1",
    exercise: { name: "Burpees", muscleGroup: "Full Body" }
  },
  {
    id: 3,
    exerciseId: 103,
    sets: 3,
    reps: 15,
    rest: 60,
    order: 3,
    grupoCombinado: "combo-1",
    exercise: { name: "Mountain Climbers", muscleGroup: "Core" }
  },
  {
    id: 4,
    exerciseId: 104,
    sets: 4,
    reps: 8,
    rest: 120,
    order: 4,
    grupoCombinado: null,
    exercise: { name: "Pull-ups", muscleGroup: "Back" }
  },
  {
    id: 5,
    exerciseId: 105,
    sets: 3,
    reps: 20,
    rest: 45,
    order: 5,
    grupoCombinado: "combo-2",
    exercise: { name: "Squats", muscleGroup: "Legs" }
  },
  {
    id: 6,
    exerciseId: 106,
    sets: 3,
    reps: 12,
    rest: 45,
    order: 6,
    grupoCombinado: "combo-2",
    exercise: { name: "Lunges", muscleGroup: "Legs" }
  }
];

export default function CombinedExerciseDemo() {
  const [workoutExercises, setWorkoutExercises] = useState(mockExercises);
  const [selectedExercises, setSelectedExercises] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Handle exercise selection for combination
  const handleExerciseSelection = (exerciseId: number, checked: boolean) => {
    const newSelection = new Set(selectedExercises);
    if (checked) {
      newSelection.add(exerciseId);
    } else {
      newSelection.delete(exerciseId);
    }
    setSelectedExercises(newSelection);
  };

  // Handle combining selected exercises
  const handleCombineExercises = () => {
    if (selectedExercises.size < 2) {
      alert("Please select at least 2 exercises to combine");
      return;
    }

    const comboId = `combo-${Date.now()}`;
    const updatedExercises = workoutExercises.map(ex => 
      selectedExercises.has(ex.id) 
        ? { ...ex, grupoCombinado: comboId }
        : ex
    );

    setWorkoutExercises(updatedExercises);
    setSelectedExercises(new Set());
    setIsSelectionMode(false);
    alert(`${selectedExercises.size} exercises combined successfully!`);
  };

  // Handle removing exercise from combination
  const handleRemoveFromCombination = (exerciseId: number) => {
    const updatedExercises = workoutExercises.map(ex => 
      ex.id === exerciseId 
        ? { ...ex, grupoCombinado: null }
        : ex
    );
    setWorkoutExercises(updatedExercises);
    alert("Exercise removed from combination");
  };

  // Helper function to get combined exercise groups
  const getCombinedGroups = () => {
    const groups = new Map<string, any[]>();
    workoutExercises.forEach((ex: any) => {
      if (ex.grupoCombinado) {
        if (!groups.has(ex.grupoCombinado)) {
          groups.set(ex.grupoCombinado, []);
        }
        groups.get(ex.grupoCombinado)!.push(ex);
      }
    });
    return groups;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
          <h1 className="text-2xl font-bold">Combined Exercise Feature Demo</h1>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">Feature Overview</h2>
          <p className="text-blue-700 text-sm">
            This demo showcases the combined exercise (exercício conjugado) feature that allows personal trainers to 
            group exercises for sequential execution without rest between them. Students will see these exercises 
            visually grouped and understand they should be performed in sequence.
          </p>
        </div>
      </div>

      <Card className="border border-gray-100">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-xl font-semibold">Workout Plan - Exercise Management</CardTitle>
          <CardDescription>
            Demonstrating exercise combination functionality for personal trainers
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Exercise List</h3>
            <div className="flex gap-2">
              {!isSelectionMode ? (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                    disabled={workoutExercises.length < 2}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conjugar Exercícios
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exercise
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedExercises(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleCombineExercises}
                    disabled={selectedExercises.size < 2}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Combine Selected ({selectedExercises.size})
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {isSelectionMode && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                Selection Mode: Choose exercises to combine for sequential execution
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Combined exercises will be executed one after another without rest between them.
              </p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  {isSelectionMode && <TableHead className="w-12">Select</TableHead>}
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Exercise</TableHead>
                  <TableHead>Muscle Group</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Rest</TableHead>
                  <TableHead>Combined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workoutExercises.map((ex: any, index: number) => {
                  const isCombined = !!ex.grupoCombinado;
                  const combinedGroups = getCombinedGroups();
                  const isFirstInGroup = isCombined && combinedGroups.get(ex.grupoCombinado)?.[0]?.id === ex.id;
                  const groupSize = isCombined ? combinedGroups.get(ex.grupoCombinado)?.length || 0 : 0;
                  
                  return (
                    <TableRow 
                      key={ex.id} 
                      className={isCombined ? "bg-blue-50 border-l-4 border-l-blue-400" : ""}
                    >
                      {isSelectionMode && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedExercises.has(ex.id)}
                            onChange={(e) => handleExerciseSelection(ex.id, e.target.checked)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ex.exercise.name}
                          {isCombined && (
                            <Badge variant="secondary" className="text-xs">
                              <LinkIcon className="h-3 w-3 mr-1" />
                              {isFirstInGroup ? `Combo (${groupSize})` : 'Combined'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{ex.exercise.muscleGroup}</TableCell>
                      <TableCell>{ex.sets}</TableCell>
                      <TableCell>{ex.reps}</TableCell>
                      <TableCell>
                        {ex.rest}s
                        {isCombined && (
                          <div className="text-xs text-blue-600 mt-1">
                            Execute in sequence
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isCombined ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Group {ex.grupoCombinado?.split('-')[1] || ''}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">Individual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {!isSelectionMode && (
                            <>
                              {isCombined && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => handleRemoveFromCombination(ex.id)}
                                  title="Remove from combination"
                                >
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => alert("Exercise removed")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Student View Preview</h4>
            <p className="text-sm text-gray-600 mb-3">
              This is how students would see the combined exercises in their workout:
            </p>
            
            <div className="space-y-2">
              {workoutExercises.map((ex, index) => {
                const isCombined = !!ex.grupoCombinado;
                const combinedGroups = getCombinedGroups();
                const isFirstInGroup = isCombined && combinedGroups.get(ex.grupoCombinado)?.[0]?.id === ex.id;
                const isLastInGroup = isCombined && combinedGroups.get(ex.grupoCombinado)?.slice(-1)[0]?.id === ex.id;
                
                return (
                  <div 
                    key={ex.id}
                    className={`p-3 rounded border ${
                      isCombined 
                        ? "bg-blue-50 border-blue-200 border-l-4 border-l-blue-400" 
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{index + 1}.</span>
                        <div>
                          <div className="font-medium">{ex.exercise.name}</div>
                          <div className="text-sm text-gray-600">
                            {ex.sets} sets × {ex.reps} reps
                          </div>
                        </div>
                        {isCombined && isFirstInGroup && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Combined Set
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {isCombined ? (
                          <span className="text-blue-600 font-medium">
                            {isLastInGroup ? "Rest after sequence" : "→ Next immediately"}
                          </span>
                        ) : (
                          `Rest: ${ex.rest}s`
                        )}
                      </div>
                    </div>
                    {isCombined && isLastInGroup && (
                      <div className="mt-2 text-xs text-blue-600 italic">
                        Complete sequence, then rest {ex.rest}s before next exercise
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}