import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp, Dumbbell, Plus, Trash2, Link as LinkIcon, Unlink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkoutDetailProps {
  id: string;
}

export default function WorkoutDetail({ id }: WorkoutDetailProps) {
  const workoutId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState("active");
  
  // Exercises management
  const [addExerciseDialogOpen, setAddExerciseDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [restTime, setRestTime] = useState("");
  const [notes, setNotes] = useState("");
  
  // Combined exercises management
  const [selectedExercises, setSelectedExercises] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);
  
  const trainerId = 1; // Using default trainer ID

  // Fetch workout plan details
  const { data: workoutPlan, isLoading: isWorkoutLoading } = useQuery({
    queryKey: [`/api/workout-plans/${workoutId}`],
    queryFn: async () => {
      const res = await fetch(`/api/workout-plans/${workoutId}`);
      if (!res.ok) throw new Error("Failed to fetch workout plan");
      return res.json();
    }
  });

  // Fetch workout exercises
  const { data: workoutExercises, isLoading: isExercisesLoading, refetch: refetchExercises } = useQuery({
    queryKey: [`/api/workout-plans/${workoutId}/exercises`],
    queryFn: async () => {
      const res = await fetch(`/api/workout-plans/${workoutId}/exercises`);
      if (!res.ok) throw new Error("Failed to fetch workout exercises");
      return res.json();
    },
    enabled: !!workoutId
  });

  // Fetch all available exercises
  const { data: exerciseLibrary, isLoading: isLibraryLoading } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: async () => {
      const res = await fetch("/api/exercises");
      if (!res.ok) throw new Error("Failed to fetch exercises");
      return res.json();
    }
  });

  // Set form values once workout plan data is loaded
  useEffect(() => {
    if (workoutPlan) {
      setName(workoutPlan.name);
      setDescription(workoutPlan.description || "");
      setDuration(workoutPlan.duration.toString());
      setStatus(workoutPlan.status);
    }
  }, [workoutPlan]);

  // Get exercise details by ID
  const getExerciseDetails = (id: number) => {
    if (!exerciseLibrary) return null;
    return exerciseLibrary.find((ex: any) => ex.id === id);
  };

  // Handle form submission
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Workout name is required"
      });
      return;
    }
    
    try {
      await apiRequest("PUT", `/api/workout-plans/${workoutId}`, {
        name,
        description,
        duration: parseInt(duration),
        status,
        trainerId
      });
      
      await queryClient.invalidateQueries({ queryKey: [`/api/workout-plans/${workoutId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
      
      toast({
        title: "Success",
        description: "Workout plan has been updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update workout plan"
      });
    }
  };

  // Handle adding a new exercise to the workout
  const handleAddExercise = async () => {
    if (!selectedExercise) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an exercise"
      });
      return;
    }
    
    try {
      const nextOrder = workoutExercises ? workoutExercises.length + 1 : 1;
      
      await apiRequest("POST", `/api/workout-exercises`, {
        workoutPlanId: workoutId,
        exerciseId: selectedExercise,
        sets: sets ? parseInt(sets) : null,
        reps: reps ? parseInt(reps) : null,
        rest: restTime ? parseInt(restTime) : null,
        notes,
        order: nextOrder
      });
      
      await refetchExercises();
      
      // Reset form
      setSelectedExercise(null);
      setSets("");
      setReps("");
      setRestTime("");
      setNotes("");
      setAddExerciseDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Exercise added to workout plan"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add exercise"
      });
    }
  };

  // Handle removing an exercise from the workout
  const handleRemoveExercise = async (exerciseId: number) => {
    try {
      await apiRequest("DELETE", `/api/workout-exercises/${exerciseId}`, undefined);
      await refetchExercises();
      
      toast({
        title: "Success",
        description: "Exercise removed from workout plan"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove exercise"
      });
    }
  };

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
  const handleCombineExercises = async () => {
    if (selectedExercises.size < 2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least 2 exercises to combine"
      });
      return;
    }

    try {
      const comboId = `combo-${Date.now()}`;
      await apiRequest("PUT", "/api/workout-exercises/combine", {
        exerciseIds: Array.from(selectedExercises),
        grupoCombinado: comboId
      });

      await refetchExercises();
      setSelectedExercises(new Set());
      setIsSelectionMode(false);
      setCombineDialogOpen(false);

      toast({
        title: "Success",
        description: `${selectedExercises.size} exercises combined successfully`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Failed to combine exercises"
      });
    }
  };

  // Handle removing exercise from combination
  const handleRemoveFromCombination = async (exerciseId: number) => {
    try {
      await apiRequest("PUT", `/api/workout-exercises/${exerciseId}`, {
        grupoCombinado: null
      });

      await refetchExercises();

      toast({
        title: "Success",
        description: "Exercise removed from combination"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove from combination"
      });
    }
  };

  // Helper function to get combined exercise groups
  const getCombinedGroups = () => {
    if (!workoutExercises) return new Map();
    
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

  // Loading state
  if (isWorkoutLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
          <Card className="border border-gray-100">
            <CardHeader className="px-6 pt-6 pb-4">
              <div className="h-7 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not found state
  if (!workoutPlan && !isWorkoutLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Workout plan not found</h2>
          <p className="text-gray-500 mb-6">The workout plan you're looking for doesn't exist or has been removed.</p>
          <Link href="/workouts">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workouts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Link
        href="/workouts"
        className="inline-flex items-center mb-6 text-sm text-primary hover:text-primary-dark"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Workouts
      </Link>

      <Card className="border border-gray-100 mb-6">
        <CardHeader className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold">Edit Workout Plan</CardTitle>
            <CardDescription>
              Update workout details and exercises
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/workouts")}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="details">Plan Details</TabsTrigger>
              <TabsTrigger value="exercises">Exercises</TabsTrigger>
              <TabsTrigger value="students">Assigned Students</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-0">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Workout Name*</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Strength Training" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the workout plan" 
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="duration">Duration (weeks)</Label>
                  <Input 
                    id="duration" 
                    type="number" 
                    min="1" 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="exercises" className="mt-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Exercise List</h3>
                <div className="flex gap-2">
                  {!isSelectionMode ? (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setIsSelectionMode(true)}
                        disabled={!workoutExercises || workoutExercises.length < 2}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Conjugar Exercícios
                      </Button>
                      <Dialog open={addExerciseDialogOpen} onOpenChange={setAddExerciseDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Exercise
                          </Button>
                        </DialogTrigger>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Exercise to Workout</DialogTitle>
                            <DialogDescription>
                              Select an exercise and specify sets, reps, and rest time.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label htmlFor="exercise">Exercise*</Label>
                              <Select value={selectedExercise?.toString() || ""} onValueChange={(value) => setSelectedExercise(parseInt(value))}>
                                <SelectTrigger id="exercise">
                                  <SelectValue placeholder="Select an exercise" />
                                </SelectTrigger>
                                <SelectContent>
                                  {exerciseLibrary?.map((exercise: any) => (
                                    <SelectItem key={exercise.id} value={exercise.id.toString()}>
                                      {exercise.name} ({exercise.muscleGroup})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="sets">Sets</Label>
                                <Input 
                                  id="sets" 
                                  type="number" 
                                  min="1" 
                                  value={sets} 
                                  onChange={(e) => setSets(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="reps">Reps</Label>
                                <Input 
                                  id="reps" 
                                  type="number" 
                                  min="1" 
                                  value={reps} 
                                  onChange={(e) => setReps(e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="rest">Rest Time (seconds)</Label>
                              <Input 
                                id="rest" 
                                type="number" 
                                min="0" 
                                value={restTime} 
                                onChange={(e) => setRestTime(e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea 
                                id="notes" 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional instructions or tips" 
                                rows={2}
                              />
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAddExerciseDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddExercise}>
                              Add to Workout
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
              
              {isExercisesLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              ) : (
                <>
                  {(!workoutExercises || workoutExercises.length === 0) ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Exercises Added</h3>
                      <p className="text-gray-500 mb-4">This workout plan doesn't have any exercises yet.</p>
                      <Button onClick={() => setAddExerciseDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Exercise
                      </Button>
                    </div>
                  ) : (
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
                            const exerciseDetails = getExerciseDetails(ex.exerciseId);
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
                                    <Checkbox
                                      checked={selectedExercises.has(ex.id)}
                                      onCheckedChange={(checked) => handleExerciseSelection(ex.id, !!checked)}
                                    />
                                  </TableCell>
                                )}
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {exerciseDetails?.name || "Unknown Exercise"}
                                    {isCombined && (
                                      <Badge variant="secondary" className="text-xs">
                                        <LinkIcon className="h-3 w-3 mr-1" />
                                        {isFirstInGroup ? `Combo (${groupSize})` : 'Combined'}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{exerciseDetails?.muscleGroup || "-"}</TableCell>
                                <TableCell>{ex.sets || "-"}</TableCell>
                                <TableCell>{ex.reps || "-"}</TableCell>
                                <TableCell>
                                  {ex.rest ? `${ex.rest}s` : "-"}
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
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-8 w-8 text-gray-500 hover:text-gray-700"
                                          onClick={() => {}}
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-8 w-8 text-gray-500 hover:text-gray-700"
                                          onClick={() => {}}
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
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
                                          onClick={() => handleRemoveExercise(ex.id)}
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
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="students" className="mt-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Students Using This Plan</h3>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign to Student
                </Button>
              </div>
              
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mx-auto mb-3">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Students Assigned</h3>
                <p className="text-gray-500 mb-4">This workout hasn't been assigned to any students yet.</p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign to Student
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
