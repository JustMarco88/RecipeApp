import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { type Recipe, type RecipeIngredient } from "@/types/recipe"
import { api } from "@/utils/api"
import { X, ChevronLeft, ChevronRight, Clock, Flame, GaugeCircle, TimerIcon, Plus, Minus, Play, Pause, ChevronDown, ChevronUp, Trash2, History, Pencil, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { type CookingHistory } from "@/types/recipe"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { RecipeForm } from "./recipe-form"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { type TRPCClientErrorLike } from "@trpc/client"
import { type AppRouter } from "@/server/api/root"
import { useRouter } from "next/navigation"

// Quick timer presets
const QUICK_TIMERS = [
  { duration: 1 },
  { duration: 5 },
  { duration: 10 },
  { duration: 15 },
] as const

interface Timer {
  id: string
  name: string
  duration: number
  timeLeft: number
  isRunning: boolean
}

interface CookingViewProps {
  recipe: Recipe
  onClose: () => void
}

function CookingHistoryList({ recipeId }: { recipeId: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<CookingHistory | null>(null)
  const { data: history } = api.recipe.getCookingHistory.useQuery(recipeId)
  const utils = api.useContext()
  const { toast } = useToast()

  const deleteCookingSession = api.recipe.deleteCookingSession.useMutation({
    onSuccess: () => {
      utils.recipe.getCookingHistory.invalidate(recipeId)
      utils.recipe.getAll.invalidate()
      toast({
        title: "Session deleted",
        description: "Your cooking session has been deleted.",
      })
    },
  })

  const handleDeleteSession = async (sessionId: string) => {
    await deleteCookingSession.mutateAsync({ id: sessionId })
  }

  // Filter out abandoned sessions from display
  const completedSessions = history?.filter((session: CookingHistory) => 
    session.completedAt && !session.notes?.includes('abandoned')
  ) || [];

  if (!completedSessions.length) {
    return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="px-0 font-normal"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <History className="h-4 w-4 mr-2" />
        <span>{completedSessions.length}x cooked</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg p-3 space-y-2 z-10 min-w-[300px]">
          {completedSessions.map((session: CookingHistory) => (
            <div key={session.id} className="flex items-start justify-between text-sm group hover:bg-muted/50 rounded-md p-2 -mx-1">
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-muted-foreground">
                    {session.completedAt && formatDistanceToNow(new Date(session.completedAt))} ago
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.actualTime} min
                  </p>
                </div>
                {session.notes && (
                  <p className="mt-1 text-sm">
                    "{session.notes}"
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={() => setSessionToDelete({
                  ...session,
                  stepFeedback: "",
                  status: "finished"
                })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cooking Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cooking session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setSessionToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (sessionToDelete) {
                  handleDeleteSession(sessionToDelete.id)
                }
              }}
            >
              Delete Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function shouldConfirmClose(
  startTime: Date,
  currentStep: number,
  totalSteps: number,
  notes: string
): boolean {
  const timeSpentMinutes = (Date.now() - startTime.getTime()) / 1000 / 60
  const hasProgress = currentStep > 0
  const hasNotes = notes.trim().length > 0
  const significantTimeSpent = timeSpentMinutes >= 5

  return hasNotes || (hasProgress && significantTimeSpent)
}

interface StepFeedback {
  liked?: boolean
  disliked?: boolean
}

interface TimerPresets {
  presets: number[];
  usage: Record<number, number>;
}

const getInitialPresets = (): TimerPresets => {
  try {
    const saved = localStorage.getItem('timerPresets');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading timer presets:', error);
  }
  return {
    presets: [5, 10, 15, 30],
    usage: {}
  };
};

// First, let's add the Ingredient interface at the top
interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
}

export function CookingView({ recipe, onClose }: CookingViewProps): JSX.Element {
  // Session state
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState<string>("");
  const [stepFeedback, setStepFeedback] = useState<Record<number, StepFeedback>>({});
  const [startTime, setStartTime] = useState(new Date());

  // UI state
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [timerPresets, setTimerPresets] = useState(getInitialPresets());
  const [newTimerName, setNewTimerName] = useState("");
  const [newTimerDuration, setNewTimerDuration] = useState(5);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const { toast } = useToast();
  const utils = api.useContext();

  // Query for existing session first
  const { data: existingSession } = api.recipe.getCurrentCookingSession.useQuery({
    recipeId: recipe.id
  });

  // Initialize ingredients
  useEffect(() => {
    if (recipe) {
      const parsedIngredients = JSON.parse(recipe.ingredients).map(
        (ing: Omit<Ingredient, "checked">) => ({
          ...ing,
          checked: false,
        })
      );
      setIngredients(parsedIngredients);
    }
  }, [recipe]);

  // Timer management
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers(prevTimers =>
        prevTimers.map(timer => {
          if (timer.isRunning && timer.timeLeft > 0) {
            const newTimeLeft = timer.timeLeft - 1;
            if (newTimeLeft === 0) {
              toast({
                title: "Timer Complete",
                description: `${timer.name} is done!`,
              });
            }
            return { ...timer, timeLeft: newTimeLeft };
          }
          return timer;
        })
      );
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [toast]);

  const updatePresetUsage = (minutes: number) => {
    const newUsage = {
      ...timerPresets.usage,
      [minutes]: (timerPresets.usage[minutes] || 0) + 1
    };
    const allPresets = Array.from(new Set([...timerPresets.presets, minutes]));
    const sortedPresets = allPresets
      .sort((a, b) => (newUsage[b] || 0) - (newUsage[a] || 0))
      .slice(0, 4);
    
    const newPresets = {
      presets: sortedPresets,
      usage: newUsage
    };
    setTimerPresets(newPresets);
    try {
      localStorage.setItem('timerPresets', JSON.stringify(newPresets));
    } catch (error) {
      console.error('Error saving timer presets:', error);
    }
  };

  const addTimer = (duration?: number) => {
    const timerDuration = duration || newTimerDuration;
    const timerName = newTimerName || `${timerDuration} min timer`;
    
    const newTimer: Timer = {
      id: Math.random().toString(36).substr(2, 9),
      name: timerName,
      duration: timerDuration * 60,
      timeLeft: timerDuration * 60,
      isRunning: true,
    };
    setTimers(prev => [...prev, newTimer]);
    setNewTimerName("");
    setNewTimerDuration(5);

    if (duration) {
      updatePresetUsage(duration);
    }
  };

  const toggleTimer = (id: string) => {
    setTimers(prev =>
      prev.map(timer =>
        timer.id === id ? { ...timer, isRunning: !timer.isRunning } : timer
      )
    );
  };

  const removeTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Session management
  const handleClose = () => {
    if (existingSession?.status === 'active') {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSaveAndClose = async () => {
    try {
      await recordCooking.mutateAsync({
        recipeId: recipe.id,
        startedAt: startTime,
        completedAt: new Date(),
        currentStep,
        notes: notes || "",
        actualTime: Math.round((Date.now() - startTime.getTime()) / 60000),
        servingsCooked: Math.round(recipe.servings * servingMultiplier),
        stepFeedback: JSON.stringify(stepFeedback),
        status: 'finished'
      });

      toast({
        title: "Progress Saved",
        description: "Your cooking session has been saved",
      });
      onClose();
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save cooking session",
      });
    }
  };

  // Resume session mutation
  const resumeSession = api.recipe.resumeSession.useMutation({
    onSuccess: (session: CookingHistory | null) => {
      if (session) {
        setCurrentStep(session.currentStep || 0);
        setNotes(session.notes || "");
        setStartTime(new Date(session.startedAt));
        
        if (session.stepFeedback) {
          try {
            const feedbackData = JSON.parse(session.stepFeedback);
            setStepFeedback(feedbackData);
          } catch (e) {
            console.error('Error parsing session feedback:', e);
          }
        }
      }
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Error resuming session:', error);
      toast({
        title: "Error",
        description: "Failed to resume cooking session",
        variant: "destructive",
      });
    }
  });

  // Record cooking mutation
  const recordCooking = api.recipe.recordCooking.useMutation({
    onSuccess: () => {
      utils.recipe.getActiveSessions.invalidate();
      utils.recipe.getCookingHistory.invalidate();
      utils.recipe.getAll.invalidate();
      utils.recipe.getCurrentCookingSession.invalidate({ recipeId: recipe.id });
    },
  });

  // Auto-resume recent session on mount
  useEffect(() => {
    if (existingSession) {
      const timeSinceStart = (Date.now() - new Date(existingSession.startedAt).getTime()) / 1000 / 60;
      if (timeSinceStart < 120) { // Less than 2 hours old
        resumeSession.mutate(existingSession.id);
        toast({
          title: "Session Resumed",
          description: "Continuing from where you left off. Click 'Start Over' if you want to begin fresh.",
        });
      }
    }
  }, [existingSession]);

  const handleStartOver = async () => {
    try {
      if (existingSession) {
        // Mark existing session as abandoned
        await recordCooking.mutateAsync({
          recipeId: recipe.id,
          startedAt: existingSession.startedAt,
          completedAt: new Date(),
          currentStep: existingSession.currentStep,
          notes: "Session abandoned - User started over",
          actualTime: Math.round((Date.now() - existingSession.startedAt.getTime()) / 60000),
          servingsCooked: recipe.servings,
          stepFeedback: "",
        });
      }

      // Reset all state
      setCurrentStep(0);
      setNotes("");
      setStepFeedback({});
      setStartTime(new Date());
      setShowStartOverDialog(false);

      // Create new session
      await recordCooking.mutateAsync({
        recipeId: recipe.id,
        startedAt: new Date(),
        completedAt: new Date(),
        currentStep: 0,
        notes: "",
        actualTime: 0,
        servingsCooked: recipe.servings,
        status: 'active'
      });

      toast({
        title: "Started Fresh",
        description: "Beginning a new cooking session.",
      });
    } catch (error) {
      console.error('Error starting over:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start new session",
      });
    }
  };

  // UI helpers
  const toggleIngredient = (index: number) => {
    setIngredients(prev =>
      prev.map((ing, i) =>
        i === index ? { ...ing, checked: !ing.checked } : ing
      )
    );
  };

  const adjustServings = (increment: boolean) => {
    setServingMultiplier(prev => {
      const newValue = increment ? prev + 0.5 : prev - 0.5;
      return Math.max(0.5, newValue);
    });
  };

  const scaledIngredients = ingredients.map(ing => ({
    ...ing,
    amount: ing.amount * servingMultiplier,
  }));

  // Add state for step editing
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editedStepText, setEditedStepText] = useState("");

  // Add updateStep mutation
  const updateStep = api.recipe.updateStep.useMutation({
    onSuccess: () => {
      utils.recipe.getById.invalidate(recipe.id);
      utils.recipe.getAll.invalidate();
      toast({
        title: "Step Updated",
        description: "Recipe instruction has been updated",
      });
      setEditingStep(null);
    },
  });

  const handleStepEdit = (index: number) => {
    setEditingStep(index);
    setEditedStepText(JSON.parse(recipe.instructions)[index]);
  };

  const handleStepSave = async () => {
    if (editingStep === null) return;

    try {
      const updatedInstructions = [...JSON.parse(recipe.instructions)];
      updatedInstructions[editingStep] = editedStepText;

      await updateStep.mutateAsync({
        recipeId: recipe.id,
        instructions: JSON.stringify(updatedInstructions),
      });
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update step",
      });
    }
  };

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle navigation when not editing
      if (editingStep !== null) return;
      
      // Prevent handling if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setCurrentStep(prev => Math.min(JSON.parse(recipe.instructions).length - 1, prev + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setCurrentStep(prev => Math.max(0, prev - 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recipe.instructions.length, editingStep]);

  const router = useRouter();

  const handleFinishCooking = async () => {
    if (!session) return;

    await recordCooking.mutateAsync({
      recipeId: recipe.id,
      startedAt: session.startedAt,
      completedAt: new Date(),
      currentStep: currentStep,
      notes: notes,
      actualTime: Math.round((Date.now() - session.startedAt.getTime()) / 60000),
      servingsCooked: Math.round(recipe.servings * servingMultiplier),
      stepFeedback: JSON.stringify(stepFeedback)
    });

    toast({
      title: "Cooking session finished",
      description: "Your cooking session has been saved.",
    });

    router.push(`/recipe/${recipe.id}`);
  };

  const handleStartNewSession = async () => {
    const newSession = await recordCooking.mutateAsync({
      recipeId: recipe.id,
      startedAt: new Date(),
      completedAt: null,
      currentStep: 0,
      notes: null,
      actualTime: 0,
      servingsCooked: recipe.servings,
      stepFeedback: null
    });

    toast({
      title: "New session started",
      description: "Started a new cooking session.",
    });

    setSession(newSession);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{recipe.title}</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 hover:opacity-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-[90vw] w-[800px] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Recipe</DialogTitle>
                    <DialogDescription>
                      Modify your recipe details
                    </DialogDescription>
                  </DialogHeader>
                  <RecipeForm recipeId={recipe.id} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Prep: {recipe.prepTime}min</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                <span>Cook: {recipe.cookTime}min</span>
              </div>
              <div className="flex items-center gap-2">
                <GaugeCircle className="h-4 w-4" />
                <span>Difficulty: {recipe.difficulty}</span>
              </div>
              <div className="relative">
                <CookingHistoryList recipeId={recipe.id} />
              </div>
            </div>
          </div>
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStartOverDialog(true)}
            >
              Start Over
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[350px,1fr] gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Ingredients */}
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
              <div className="mb-6">
                <label className="block text-sm mb-2">Servings</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustServings(false)}
                    disabled={servingMultiplier <= 0.5}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-semibold">
                      {Math.round(recipe.servings * servingMultiplier)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      (Original: {recipe.servings})
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustServings(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {scaledIngredients.map((ing, index) => (
                  <div
                    key={index}
                    className={cn(
                      "transition-colors relative group min-h-[36px] rounded-lg",
                      ing.checked ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <div 
                      className="flex items-center gap-3 py-1.5 px-2 cursor-pointer" 
                      onClick={() => toggleIngredient(index)}
                    >
                      <Checkbox
                        checked={ing.checked}
                        className="opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                      <span className={cn(
                        "flex-1",
                        ing.checked && "line-through text-muted-foreground"
                      )}>
                        {ing.amount.toFixed(1)} {ing.unit} {ing.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <div 
                className={cn(
                  "transition-colors relative group rounded-lg",
                  notes ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about your cooking experience..."
                  className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-0 p-3"
                />
              </div>
            </div>

            {/* Timers */}
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Timers</h2>
              <div className="space-y-4">
                {/* Quick Timer Buttons */}
                <div className="flex flex-wrap gap-2">
                  {timerPresets.presets.map((minutes) => (
                    <Button
                      key={minutes}
                      variant="outline"
                      onClick={() => addTimer(minutes)}
                      className="flex-1"
                    >
                      {minutes} min
                    </Button>
                  ))}
                </div>

                {/* Custom Timer */}
                <div className="space-y-4">
                  <Input
                    placeholder="Timer name (optional)"
                    value={newTimerName}
                    onChange={(e) => setNewTimerName(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNewTimerDuration(prev => Math.max(1, prev - 1))}
                      disabled={newTimerDuration <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-semibold">
                        {newTimerDuration}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        minutes
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNewTimerDuration(prev => prev + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={() => addTimer()} className="w-full">
                    Add Timer
                  </Button>
                </div>

                {/* Active Timers */}
                <div className="space-y-2">
                  {timers.map((timer) => (
                    <div
                      key={timer.id}
                      className="flex items-center justify-between bg-muted p-3 rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{timer.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(timer.timeLeft)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTimer(timer.id)}
                        >
                          {timer.isRunning ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTimer(timer.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Instructions */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <div className="space-y-3">
                {JSON.parse(recipe.instructions).map((instruction: string, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      "transition-colors relative group min-h-[80px]",
                      index === currentStep ? "bg-primary/10" : "hover:bg-muted/50",
                      "rounded-lg p-4"
                    )}
                    onClick={() => setCurrentStep(index)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStepEdit(index);
                    }}
                  >
                    <div className="flex gap-4">
                      <div className="flex-none flex flex-col items-center gap-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-background border text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 transition-colors opacity-50 hover:opacity-100",
                              stepFeedback[index]?.liked && "opacity-100 text-green-500"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStepFeedback(prev => ({
                                ...prev,
                                [index]: {
                                  liked: !prev[index]?.liked,
                                  disliked: false
                                }
                              }));
                            }}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 transition-colors opacity-50 hover:opacity-100",
                              stepFeedback[index]?.disliked && "opacity-100 text-red-500"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStepFeedback(prev => ({
                                ...prev,
                                [index]: {
                                  liked: false,
                                  disliked: !prev[index]?.disliked
                                }
                              }));
                            }}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        {editingStep === index ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editedStepText}
                              onChange={(e) => setEditedStepText(e.target.value)}
                              className="min-h-[100px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.metaKey) {
                                  handleStepSave();
                                } else if (e.key === 'Escape') {
                                  setEditingStep(null);
                                }
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStep(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleStepSave}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p>{instruction}</p>
                        )}
                      </div>
                      {/* Next/Previous buttons container */}
                      {!editingStep && (
                        <div className="absolute bottom-2 right-4 flex items-center gap-1">
                          {/* Previous button - only show for current step */}
                          {index === currentStep && index > 0 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Previous Step (←)"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentStep(prev => Math.max(0, prev - 1));
                              }}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                          )}
                          {/* Next button */}
                          {index === currentStep && index < JSON.parse(recipe.instructions).length - 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Next Step (→)"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentStep(prev => Math.min(JSON.parse(recipe.instructions).length - 1, prev + 1));
                              }}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t shadow-lg">
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {JSON.parse(recipe.instructions).length}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  Use ←/→ or ↑/↓ keys to navigate
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                {currentStep === JSON.parse(recipe.instructions).length - 1 ? (
                  <Button onClick={handleSaveAndClose}>
                    Finish Cooking
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      setCurrentStep((prev) =>
                        Math.min(JSON.parse(recipe.instructions).length - 1, prev + 1)
                      )
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add padding at the bottom to prevent content from being hidden behind the navigation bar */}
        <div className="h-24" />
      </div>

      {/* Dialogs */}
      <Dialog open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Over?</DialogTitle>
            <DialogDescription>
              This will abandon your current progress and start a fresh cooking session.
              Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowStartOverDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStartOver}
            >
              Start Over
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Progress?</DialogTitle>
            <DialogDescription>
              Would you like to save your cooking progress before closing?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCloseConfirm(false);
                onClose();
              }}
            >
              Don't Save
            </Button>
            <Button onClick={handleSaveAndClose}>
              Save & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 