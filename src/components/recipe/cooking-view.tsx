import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { type Recipe, type RecipeIngredient, type RecipeImprovement } from "@/types/recipe"
import { trpc } from "@/utils/trpc"
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
  skipResumeDialog?: boolean
}

function CookingHistoryList({ recipeId }: { recipeId: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<CookingHistory | null>(null)
  const { data: history } = trpc.recipe.getCookingHistory.useQuery(recipeId)
  const utils = trpc.useContext()
  const { toast } = useToast()

  const deleteCookingSession = trpc.recipe.deleteCookingSession.useMutation({
    onSuccess: () => {
      utils.recipe.getCookingHistory.invalidate(recipeId)
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Cooking session deleted",
      })
      setSessionToDelete(null)
    },
  })

  if (!history?.length) {
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
        <span>{history.length}x cooked</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg p-3 space-y-2 z-10 min-w-[300px]">
          {history.map((session) => (
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
                onClick={() => setSessionToDelete(session)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent onKeyDown={(e) => {
          if (e.key === 'Enter' && sessionToDelete) {
            deleteCookingSession.mutate(sessionToDelete.id)
          }
        }}>
          <DialogHeader>
            <DialogTitle>Delete Cooking Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cooking session? This action cannot be undone.
              Press Enter to confirm.
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
                  deleteCookingSession.mutate(sessionToDelete.id)
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

export function CookingView({ recipe, onClose, skipResumeDialog = false }: CookingViewProps): JSX.Element {
  // Query for existing session first
  const { data: existingSession } = trpc.recipe.getCurrentCookingSession.useQuery({
    recipeId: recipe.id
  })

  const [currentStep, setCurrentStep] = useState(0)
  const [servings, setServings] = useState<number>(() => {
    try {
      return recipe.servings || 1
    } catch (e) {
      console.error('Error accessing recipe servings:', e)
      return 1
    }
  })
  const [notes, setNotes] = useState<string>("")
  const [ingredients, setIngredients] = useState<Array<RecipeIngredient & { checked: boolean }>>(() => {
    try {
      return JSON.parse(recipe.ingredients).map((ing: RecipeIngredient) => ({
        ...ing,
        checked: false
      }))
    } catch (e) {
      console.error('Error parsing ingredients:', e)
      return []
    }
  })
  const [instructions, setInstructions] = useState<Array<{ text: string; checked: boolean }>>(() => {
    try {
      return JSON.parse(recipe.instructions).map((inst: string) => ({
        text: inst,
        checked: false
      }))
    } catch (e) {
      console.error('Error parsing instructions:', e)
      return []
    }
  })
  const [startTime, setStartTime] = useState(new Date())
  const [timers, setTimers] = useState<Timer[]>([])
  const [newTimerName, setNewTimerName] = useState("")
  const [newTimerDuration, setNewTimerDuration] = useState(5)
  const [scale, setScale] = useState(1)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { toast } = useToast()
  const utils = trpc.useContext()
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editedStepText, setEditedStepText] = useState("")
  const [stepFeedback, setStepFeedback] = useState<Record<number, StepFeedback>>({})
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [improvements, setImprovements] = useState<RecipeImprovement | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  // Update startTime when existingSession is loaded
  useEffect(() => {
    if (existingSession) {
      setStartTime(new Date(existingSession.startedAt))
    }
  }, [existingSession])

  // Save session mutation
  const saveSession = trpc.recipe.saveSession.useMutation({
    onSuccess: () => {
      toast({
        title: "Progress Saved",
        description: "Your cooking session has been saved",
      })
      onClose()
    },
  })

  // Resume session mutation
  const resumeSession = trpc.recipe.resumeSession.useMutation({
    onSuccess: (session) => {
      if (session) {
        setCurrentStep(session.currentStep || 0)
        setNotes(session.notes || "")
        setStartTime(new Date(session.startedAt))
        if (session.ingredients) {
          try {
            setIngredients(JSON.parse(session.ingredients))
          } catch (e) {
            console.error('Error parsing session ingredients:', e)
          }
        }
        if (session.instructions) {
          try {
            setInstructions(JSON.parse(session.instructions))
          } catch (e) {
            console.error('Error parsing session instructions:', e)
          }
        }
      }
    },
  })

  // Check for existing session on mount
  useEffect(() => {
    if (existingSession && !skipResumeDialog) {
      const timeSinceStart = (Date.now() - new Date(existingSession.startedAt).getTime()) / 1000 / 60
      if (timeSinceStart < 120) { // Less than 2 hours old
        setShowResumeDialog(true)
      }
    } else if (existingSession && skipResumeDialog) {
      // Automatically resume the session if skipResumeDialog is true
      resumeSession.mutate(existingSession.id)
    }
  }, [existingSession, skipResumeDialog])

  const handleSaveAndExit = async () => {
    try {
      await saveSession.mutateAsync({
        recipeId: recipe.id,
        currentStep,
        notes,
        ingredients: JSON.stringify(ingredients),
        instructions: JSON.stringify(instructions),
        startTime,
      })
    } catch (error) {
      console.error('Error saving session:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save cooking session",
      })
    }
  }

  // Timer functionality
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers(prevTimers =>
        prevTimers.map(timer => {
          if (timer.isRunning && timer.timeLeft > 0) {
            const newTimeLeft = timer.timeLeft - 1
            if (newTimeLeft === 0) {
              toast({
                title: "Timer Complete",
                description: `${timer.name} is done!`,
              })
            }
            return { ...timer, timeLeft: newTimeLeft }
          }
          return timer
        })
      )
    }, 1000)

    return () => clearInterval(timerInterval)
  }, [toast])

  const addTimer = () => {
    if (newTimerDuration <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Duration",
        description: "Timer duration must be greater than 0",
      })
      return
    }

    const timerName = newTimerName.trim() || `${newTimerDuration} min timer`
    const newTimer: Timer = {
      id: Math.random().toString(36).substr(2, 9),
      name: timerName,
      duration: newTimerDuration * 60,
      timeLeft: newTimerDuration * 60,
      isRunning: true,
    }
    setTimers(prev => [...prev, newTimer])
    setNewTimerName("")
    setNewTimerDuration(5)
  }

  const toggleTimer = (id: string) => {
    setTimers(prev =>
      prev.map(timer =>
        timer.id === id ? { ...timer, isRunning: !timer.isRunning } : timer
      )
    )
  }

  const removeTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id))
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const recordCooking = trpc.recipe.recordCooking.useMutation({
    onError: (error) => {
      console.error('Failed to record cooking:', error);
      toast({
        title: 'Error',
        description: 'Failed to record cooking session',
        variant: 'destructive',
      });
    },
  });

  const getRecipeImprovements = trpc.recipe.getRecipeImprovements.useMutation()
  const updateRecipe = trpc.recipe.updateRecipe.useMutation({
    onSuccess: () => {
      utils.recipe.getById.invalidate(recipe.id)
      utils.recipe.getAll.invalidate()
    },
  })

  const finishCooking = async () => {
    if (!recipe || !startTime) return;
    
    setIsFinishing(true);
    const endTime = new Date();
    const actualTime = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    
    try {
      // First, record the cooking session
      await recordCooking.mutateAsync({
        recipeId: recipe.id,
        startedAt: startTime,
        completedAt: endTime,
        notes: notes,
        actualTime: actualTime,
        servingsCooked: recipe.servings
      });

      // Check if we have any feedback to process
      const stepFeedbackArray = Object.entries(stepFeedback)
        .filter(([_, feedback]) => feedback.liked !== undefined || feedback.disliked !== undefined)
        .map(([index, feedback]) => ({
          stepIndex: parseInt(index),
          liked: feedback.liked || false,
          disliked: feedback.disliked || false
        }));

      const hasFeedback = stepFeedbackArray.length > 0;
      const hasNotes = notes.trim().length > 0;
      const hasTimeDeviation = Math.abs(actualTime - (recipe.prepTime + recipe.cookTime)) > 5;

      if (hasFeedback || hasNotes || hasTimeDeviation) {
        const result = await getRecipeImprovements.mutateAsync({
          recipe: {
            title: recipe.title,
            instructions: JSON.parse(recipe.instructions),
            feedback: stepFeedbackArray,
            notes: notes,
            actualTime: actualTime,
            expectedTime: recipe.prepTime + recipe.cookTime
          }
        });

        if ('improvedSteps' in result) {
          // Create a new array with original steps
          const originalSteps = JSON.parse(recipe.instructions) as string[];
          const updatedSteps = [...originalSteps];

          // Replace only the steps that were improved
          result.improvedSteps.forEach(improvedStep => {
            const match = improvedStep.match(/^(\d+)\.\s*(.*)/);
            if (match) {
              const stepIndex = parseInt(match[1]) - 1;
              const stepContent = match[2];
              if (stepIndex >= 0 && stepIndex < updatedSteps.length) {
                updatedSteps[stepIndex] = stepContent;
              }
            }
          });

          setImprovements({
            improvedSteps: updatedSteps,
            summary: result.summary,
            tips: result.tips
          });
        }
      } else {
        // If no feedback or significant changes, just close
        toast({
          title: "Cooking Session Completed",
          description: "Your cooking session has been recorded successfully.",
        });
        onClose();
      }
    } catch (error) {
      console.error('Error finishing cooking session:', error);
      toast({
        title: "Error",
        description: "Failed to complete cooking session",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleIngredient = (index: number) => {
    setIngredients(prev =>
      prev.map((ing, i) =>
        i === index ? { ...ing, checked: !ing.checked } : ing
      )
    )
  }

  const addQuickTimer = (duration: number) => {
    const newTimer: Timer = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${duration} min timer`,
      duration: duration * 60,
      timeLeft: duration * 60,
      isRunning: true,
    }
    setTimers(prev => [...prev, newTimer])
    toast({
      title: "Timer Added",
      description: `Added ${duration} minute timer`,
    })
  }

  // Function to scale ingredient quantities
  const scaleQuantity = (quantity: string | number | null) => {
    if (quantity === null) return "";
    const numericValue = typeof quantity === "string" ? parseFloat(quantity) : quantity;
    if (isNaN(numericValue)) return quantity;
    return (numericValue * scale).toFixed(2).replace(/\.?0+$/, "");
  }

  const handleClose = () => {
    if (shouldConfirmClose(startTime, currentStep, instructions.length, notes)) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const updateStep = trpc.recipe.updateStep.useMutation({
    onSuccess: () => {
      utils.recipe.getById.invalidate(recipe.id)
      utils.recipe.getAll.invalidate()
      toast({
        title: "Step Updated",
        description: "Recipe instruction has been updated",
      })
      setEditingStep(null)
    },
  })

  const handleStepEdit = (index: number) => {
    setEditingStep(index)
    setEditedStepText(instructions[index].text)
  }

  const handleStepSave = async () => {
    if (editingStep === null) return

    try {
      const updatedInstructions = [...instructions]
      updatedInstructions[editingStep] = {
        ...updatedInstructions[editingStep],
        text: editedStepText,
      }

      await updateStep.mutateAsync({
        recipeId: recipe.id,
        instructions: JSON.stringify(updatedInstructions.map(i => i.text)),
      })

      setInstructions(updatedInstructions)
    } catch (error) {
      console.error('Error updating step:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update step",
      })
    }
  }

  const handleStepFeedback = (index: number, type: 'like' | 'dislike') => {
    setStepFeedback(prev => ({
      ...prev,
      [index]: {
        liked: type === 'like' ? !prev[index]?.liked : false,
        disliked: type === 'dislike' ? !prev[index]?.disliked : false,
      }
    }))
  }

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
          setCurrentStep(prev => Math.min(instructions.length - 1, prev + 1));
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
  }, [instructions.length, editingStep]);

  return (
    <>
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        <div className="container mx-auto p-4 max-w-6xl">
          {/* Enhanced Header */}
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
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-[350px,1fr] gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Ingredients */}
              <div className="bg-card rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
                <div className="space-y-1">
                  {ingredients.map((ing, index) => (
                    <div
                      key={index}
                      className={cn(
                        "transition-colors relative group min-h-[36px] rounded-lg",
                        ing.checked ? "bg-muted" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 py-1.5 px-2 cursor-pointer" onClick={() => toggleIngredient(index)}>
                        <Checkbox
                          checked={ing.checked}
                          className="opacity-50 group-hover:opacity-100 transition-opacity"
                        />
                        <span className={cn(
                          "flex-1",
                          ing.checked && "line-through text-muted-foreground"
                        )}>
                          {ing.amount} {ing.unit} {ing.name}
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
                  <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_TIMERS.map((timer) => (
                      <Button
                        key={timer.duration}
                        variant="outline"
                        onClick={() => addQuickTimer(timer.duration)}
                      >
                        {timer.duration} min
                      </Button>
                    ))}
                  </div>

                  {/* Custom Timer Input */}
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <div className="space-y-2">
                      <Input
                        placeholder="Timer name"
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
                    </div>
                    <Button onClick={addTimer} className="h-full">
                      <TimerIcon className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
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

              {/* Pro Tips Section - if recipe has stored tips */}
              {recipe.tips && (
                <div className="bg-card rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Pro Tips</h2>
                  <div className="space-y-3">
                    {JSON.parse(recipe.tips || '[]').map((tip: string, index: number) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-none pt-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <p className="flex-1 text-muted-foreground">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Instructions */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                <div className="space-y-3">
                  {instructions.map((step, index) => (
                    <div
                      key={index}
                      className={cn(
                        "transition-colors relative group min-h-[80px]",
                        index === currentStep ? "bg-primary/10" : "hover:bg-muted/50",
                        "rounded-lg"
                      )}
                    >
                      <div 
                        className="flex gap-4 p-3 cursor-pointer h-full"
                        onClick={() => {
                          setCurrentStep(index);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStepEdit(index);
                        }}
                      >
                        {/* Left column with step number and feedback */}
                        <div className="flex-none flex flex-col items-center gap-1">
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
                                handleStepFeedback(index, 'like');
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
                                handleStepFeedback(index, 'dislike');
                              }}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Main content */}
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
                            <div className="flex justify-between gap-4">
                              <p className="flex-1">{step.text}</p>
                              {/* Next buttons container */}
                              <div className="absolute bottom-2 right-4 flex items-center gap-1">
                                {/* Previous button - only show for current step */}
                                {index === currentStep && index > 0 && !editingStep && (
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
                                {index === currentStep && index < instructions.length - 1 && !editingStep && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Next Step (→)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentStep(prev => Math.min(instructions.length - 1, prev + 1));
                                    }}
                                  >
                                    <ChevronRight className="h-5 w-5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t shadow-lg">
            <div className="container mx-auto p-4 max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {instructions.length}
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
                    className="min-w-[100px]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  {currentStep === instructions.length - 1 ? (
                    <Button 
                      onClick={finishCooking}
                      disabled={isFinishing}
                      className="min-w-[100px]"
                    >
                      {isFinishing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Finishing...
                        </>
                      ) : (
                        'Finish Cooking'
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        setCurrentStep((prev) =>
                          Math.min(instructions.length - 1, prev + 1)
                        )
                      }
                      className="min-w-[100px]"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add padding at the bottom to prevent content from being hidden behind the floating bar */}
          <div className="h-24" />

          <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resume Previous Session?</DialogTitle>
                <DialogDescription>
                  {existingSession && `You have an unfinished cooking session from ${formatDistanceToNow(new Date(existingSession.startedAt))} ago.`}
                  Would you like to resume where you left off?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowResumeDialog(false)}>
                  Start New
                </Button>
                <Button onClick={() => {
                  if (existingSession) {
                    resumeSession.mutate(existingSession.id);
                    setShowResumeDialog(false);
                  }
                }}>
                  Resume
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!improvements} onOpenChange={() => setImprovements(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Recipe Improvements Available
                </DialogTitle>
                <DialogDescription>
                  Based on your cooking experience, we've analyzed your feedback and timing to enhance this recipe.
                  {notes && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <span className="font-medium">Your Notes:</span>
                      <p className="mt-1 italic text-muted-foreground">"{notes}"</p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                {improvements && (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-muted/30 rounded-lg p-6 border">
                      <h3 className="text-lg font-semibold mb-3">What's Changing</h3>
                      <p className="text-muted-foreground leading-relaxed">{improvements.summary}</p>
                    </div>

                    {/* Instructions Comparison with Checkboxes */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        Select Changes to Apply
                        <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                          Review Each Step
                        </span>
                      </h3>
                      <div className="divide-y divide-border/50">
                        {improvements.improvedSteps.map((step, index) => {
                          const originalStep = JSON.parse(recipe.instructions)[index];
                          const isChanged = step !== originalStep;
                          const feedback = stepFeedback[index];
                          
                          if (!isChanged) return null;

                          return (
                            <div key={index} className="py-4">
                              <div className="flex gap-4">
                                <div className="flex-none pt-1">
                                  <Checkbox 
                                    id={`step-${index}`}
                                    defaultChecked
                                    onCheckedChange={(checked: boolean) => {
                                      const updatedSteps = [...improvements.improvedSteps];
                                      updatedSteps[index] = checked ? step : originalStep;
                                      setImprovements({
                                        ...improvements,
                                        improvedSteps: updatedSteps
                                      });
                                    }}
                                  />
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor={`step-${index}`}
                                      className="text-base font-medium text-green-600 dark:text-green-400"
                                    >
                                      New Step {index + 1}:
                                    </label>
                                    <p>{step}</p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <span className="text-sm text-muted-foreground">Original:</span>
                                    <p className="text-sm text-muted-foreground">{originalStep}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pro Tips with Checkboxes */}
                    <div className="bg-muted/30 rounded-lg p-6 border">
                      <h3 className="text-lg font-semibold mb-4">Select Pro Tips to Save</h3>
                      <div className="space-y-3">
                        {improvements.tips.map((tip, index) => (
                          <div key={index} className="flex gap-3 items-start">
                            <div className="flex-none pt-1">
                              <Checkbox 
                                id={`tip-${index}`}
                                defaultChecked
                                onCheckedChange={(checked: boolean) => {
                                  const updatedTips = [...improvements.tips];
                                  if (!checked) {
                                    updatedTips.splice(index, 1);
                                  }
                                  setImprovements({
                                    ...improvements,
                                    tips: updatedTips
                                  });
                                }}
                              />
                            </div>
                            <label
                              htmlFor={`tip-${index}`}
                              className="flex-1 text-muted-foreground"
                            >
                              {tip}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>

              <DialogFooter className="flex items-center justify-between gap-4 mt-6 pt-6 border-t">
                <div className="flex-1 text-sm text-muted-foreground">
                  Select which improvements you'd like to apply to your recipe.
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImprovements(null);
                      onClose();
                    }}
                  >
                    Discard All
                  </Button>
                  <Button
                    onClick={async () => {
                      if (improvements && recipe) {
                        await updateRecipe.mutateAsync({
                          id: recipe.id,
                          instructions: JSON.stringify(improvements.improvedSteps),
                          tips: JSON.stringify(improvements.tips || [])
                        } as any);
                        toast({
                          title: "Recipe Updated Successfully",
                          description: "Your recipe has been enhanced with the selected improvements",
                        });
                        setImprovements(null);
                        onClose();
                      }
                    }}
                    className="gap-2"
                  >
                    <span>Apply Selected Changes</span>
                    <span className="text-lg">✨</span>
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exit Cooking Mode?</DialogTitle>
                <DialogDescription>
                  You've been cooking for {Math.floor((Date.now() - startTime.getTime()) / 1000 / 60)} minutes
                  {currentStep > 0 && ` and reached step ${currentStep + 1} of ${instructions.length}`}
                  {notes.trim().length > 0 && ` with notes added`}.
                  Would you like to save your progress before leaving?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  Continue Cooking
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveAndExit}
                >
                  Save & Exit
                </Button>
                <Button
                  variant="destructive"
                  onClick={onClose}
                >
                  Exit Without Saving
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
} 