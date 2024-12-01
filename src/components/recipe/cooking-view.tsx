import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { type Recipe } from '@/store/cookingStore'
import { api } from "@/utils/api"
import { X, ChevronLeft, ChevronRight, Clock, Flame, GaugeCircle, TimerIcon, Plus, Minus, Play, Pause, ChevronDown, ChevronUp, Trash2, History, Pencil, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import { Label } from "@/components/ui/label"
import Image from "next/image"
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
import { useCookingSession } from "@/hooks/useCookingSession"
import { useRouter } from "next/navigation"
import { useCookingStore } from "@/store/cookingStore"
import { trpc } from "@/utils/trpc"

// Quick timer presets
const QUICK_TIMERS = [
  { duration: 1 },
  { duration: 5 },
  { duration: 10 },
  { duration: 15 },
] as const

interface Ingredient {
  name: string
  amount: number
  unit: string
  checked: boolean
}

interface CookingViewProps {
  recipe: Recipe
  onClose: () => void
}

interface CookingHistory {
  id: string
  completedAt: Date | null
  notes: string | null
  actualTime: number
}

function CookingHistoryList({ recipeId }: { recipeId: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
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

  // Filter out abandoned sessions from display
  const completedSessions = history?.filter((session: CookingHistory) => 
    session.completedAt && !session.notes?.includes('abandoned')
  ) || []

  if (!completedSessions.length) return null

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
          {completedSessions.map((session) => (
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
                onClick={() => deleteCookingSession.mutate({ id: session.id })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ActiveSessionButton({ recipeId }: { recipeId: string }) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { toast } = useToast()
  const { sessions, endSession } = useCookingStore()
  const session = sessions[recipeId]

  if (!session || session.status !== 'paused') return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="px-0 font-normal text-orange-500 hover:text-orange-600"
        onClick={() => setShowCloseConfirm(true)}
      >
        <Clock className="h-4 w-4 mr-2" />
        <span>Active Session</span>
        <X className="h-4 w-4 ml-2 opacity-70" />
      </Button>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Active Session?</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this cooking session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                endSession(recipeId)
                setShowCloseConfirm(false)
                toast({
                  title: "Session Closed",
                  description: "Your cooking session has been closed.",
                })
              }}
            >
              Close Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function CookingView({ recipe, onClose }: CookingViewProps): JSX.Element {
  const [showStartOverDialog, setShowStartOverDialog] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [servingMultiplier, setServingMultiplier] = useState(1)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editedStepText, setEditedStepText] = useState("")
  const [showNotes, setShowNotes] = useState<number | null>(null)
  const [hasShownSessionPrompt, setHasShownSessionPrompt] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const utils = trpc.useContext()

  // Initialize cooking session
  const {
    session,
    isActive,
    currentStep,
    notes,
    stepRatings,
    timers,
    startCooking,
    pauseCooking,
    finishCooking,
    setCurrentStep,
    addNote,
    rateStep,
    addTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    deleteTimer,
    renameTimer,
    updateTimerRemaining,
    toggleIngredient,
  } = useCookingSession(recipe)

  // Timer state
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null)
  const [editedTimerName, setEditedTimerName] = useState("")

  // Auto-update effect for timers
  useEffect(() => {
    if (!session || !session.timers) return

    const updateTimers = () => {
      const now = new Date()
      session.timers.forEach((timer) => {
        if (!timer || !timer.isActive) return
        
        const elapsed = Math.floor((now.getTime() - new Date(timer.lastUpdatedAt).getTime()) / 1000)
        const newRemaining = Math.max(0, timer.remaining - elapsed)
        
        if (newRemaining !== timer.remaining) {
          updateTimerRemaining(timer.id, newRemaining)
          
          // Handle timer completion
          if (newRemaining === 0) {
            const audio = new Audio('/notification.mp3')
            void audio.play().catch(console.error)
            
            toast({
              title: `Timer Complete: ${timer.name}`,
              description: "Your timer has finished!",
              duration: 5000,
            })
          }
        }
      })
    }

    const timerInterval = setInterval(updateTimers, 1000)
    return () => clearInterval(timerInterval)
  }, [session, toast, updateTimerRemaining])

  // Timer helpers
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleRenameTimer = (timerId: string) => {
    setEditingTimerId(timerId)
    const timer = timers.find(t => t.id === timerId)
    if (timer) {
      setEditedTimerName(timer.name)
    }
  }

  const saveTimerName = (timerId: string) => {
    if (editedTimerName.trim()) {
      renameTimer(timerId, editedTimerName.trim())
    }
    setEditingTimerId(null)
    setEditedTimerName("")
  }

  // Check for existing session and handle session restoration
  useEffect(() => {
    if (recipe && !isActive && !hasShownSessionPrompt) {
      // Check if there's a saved session
      const savedSession = useCookingStore.getState().sessions[recipe.id]
      if (savedSession && savedSession.status === 'paused') {
        // Calculate time since last active
        const timeSinceLastActive = Date.now() - new Date(savedSession.lastActiveAt).getTime()
        const hoursInactive = timeSinceLastActive / (1000 * 60 * 60)
        
        // Check for meaningful progress
        const hasProgress = savedSession.currentStep > 0
        const hasNotes = Object.keys(savedSession.notes || {}).length > 0
        const hasRatings = Object.keys(savedSession.stepRatings || {}).length > 0
        const hasActiveTimers = savedSession.timers?.some(t => t.isActive) || false
        
        if (hoursInactive < 24 && (hasNotes || hasRatings || hasActiveTimers || hasProgress)) {
          setHasShownSessionPrompt(true)
          
          // Automatically resume if session is less than 1 hour old
          if (hoursInactive < 1) {
            startCooking()
            if (savedSession.currentStep !== undefined) {
              setCurrentStep(savedSession.currentStep)
            }
            toast({
              title: "Session resumed",
              description: "Continuing from where you left off",
            })
          } else {
            // For older sessions, show the prompt
            toast({
              title: "Previous session found",
              description: savedSession.timers?.some(t => t.isActive)
                ? "You have active timers in your previous session. Would you like to resume?"
                : "Would you like to resume your previous cooking session?",
              action: (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      startCooking()
                      if (savedSession.currentStep !== undefined) {
                        setCurrentStep(savedSession.currentStep)
                      }
                      toast({
                        title: "Session resumed",
                        description: "Continuing from where you left off",
                      })
                    }}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Force start a new session by first cleaning up the old one
                      finishCooking()
                      startCooking()
                      toast({
                        title: "New session started",
                        description: "Starting fresh",
                      })
                    }}
                  >
                    Start Fresh
                  </Button>
                </div>
              ),
            })
          }
        } else {
          // Session is too old or has no meaningful progress, start fresh
          startCooking()
        }
      } else {
        // No saved session or invalid status, start fresh
        startCooking()
      }
    }
  }, [recipe, isActive, startCooking, finishCooking, toast, hasShownSessionPrompt, setCurrentStep])

  // Parse instructions once
  const instructions = useMemo(() => {
    try {
      return JSON.parse(recipe.instructions) as string[]
    } catch (e) {
      console.error('Error parsing instructions:', e)
      return []
    }
  }, [recipe.instructions])

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (!session) {
      onClose()
      return
    }

    const isLastStep = currentStep === instructions.length - 1
    const hasProgress = currentStep > 0 || 
      Object.keys(notes).length > 0 || 
      Object.keys(stepRatings).length > 0 || 
      Object.keys(session.checkedIngredients).length > 0 ||
      timers.some(t => t.isActive)

    if (isLastStep) {
      // On last step, ask if they want to mark as completed
      setShowCloseConfirm(true)
    } else if (hasProgress) {
      // Auto-save if there's any progress
      pauseCooking()
      toast({
        title: "Progress saved",
        description: "Your cooking progress has been saved. You can resume later.",
      })
      onClose()
    } else {
      // No progress, just close
      finishCooking()
      onClose()
    }
  }, [session, currentStep, instructions.length, notes, stepRatings, timers, finishCooking, pauseCooking, onClose, toast, setShowCloseConfirm])

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (!session || !isActive || currentStep >= instructions.length - 1) {
      console.log('Cannot go to next step:', { session, isActive, currentStep, totalSteps: instructions.length })
      return
    }
    setCurrentStep(currentStep + 1)
  }, [currentStep, instructions.length, setCurrentStep, session, isActive])

  const goToPreviousStep = useCallback(() => {
    if (!session || !isActive || currentStep <= 0) {
      console.log('Cannot go to previous step:', { session, isActive, currentStep })
      return
    }
    setCurrentStep(currentStep - 1)
  }, [currentStep, setCurrentStep, session, isActive])

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle navigation when session is active
      if (!session) return

      // Only handle navigation when not editing
      if (editingStep !== null) return
      
      // Prevent handling if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          goToNextStep()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          goToPreviousStep()
          break
        case 'n':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            setShowNotes(currentStep)
          }
          break
        case 'Escape':
          if (showNotes !== null) {
            setShowNotes(null)
          } else {
            handleClose()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, currentStep, goToNextStep, goToPreviousStep, handleClose])

  // Initialize ingredients
  useEffect(() => {
    if (recipe) {
      const parsedIngredients = JSON.parse(recipe.ingredients).map(
        (ing: Omit<Ingredient, "checked">, index: number) => ({
          ...ing,
          checked: session?.checkedIngredients?.[index] ?? false,
        })
      )
      setIngredients(parsedIngredients)
    }
  }, [recipe, session?.checkedIngredients])

  const handleStepEdit = (index: number) => {
    setEditingStep(index)
    setEditedStepText(instructions[index])
  }

  const handleStepSave = async () => {
    if (editingStep === null) return

    try {
      const updatedInstructions = [...instructions]
      updatedInstructions[editingStep] = editedStepText

      await updateStep.mutateAsync({
        recipeId: recipe.id,
        instructions: JSON.stringify(updatedInstructions),
      })
    } catch (error) {
      console.error('Error updating step:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update step",
      })
    }
  }

  // Add updateStep mutation
  const updateStep = api.recipe.updateStep.useMutation({
    onSuccess: () => {
      void utils.recipe.getById.invalidate(recipe.id)
      void utils.recipe.getAll.invalidate()
      toast({
        title: "Step Updated",
        description: "Recipe instruction has been updated",
      })
      setEditingStep(null)
    },
  })

  const handleStartOver = () => {
    setCurrentStep(0)
    startCooking()
    setShowStartOverDialog(false)
  }

  // Add recordCooking mutation
  const recordCooking = api.recipe.recordCooking.useMutation({
    onSuccess: () => {
      void utils.recipe.getCookingHistory.invalidate(recipe.id)
      void utils.recipe.getAll.invalidate()
    }
  })

  const handleFinishCooking = async () => {
    if (!session) return

    try {
      // Calculate actual cooking time in minutes
      const startTime = new Date(session.startedAt).getTime()
      const endTime = Date.now()
      const actualTimeMinutes = Math.round((endTime - startTime) / (1000 * 60))

      // Record to database
      await recordCooking.mutateAsync({
        recipeId: session.recipeId,
        startedAt: new Date(session.startedAt),
        completedAt: new Date(),
        currentStep: session.currentStep,
        notes: Object.values(session.notes).join('\n') || null,
        actualTime: actualTimeMinutes,
        servingsCooked: null,
        stepFeedback: Object.entries(session.stepRatings)
          .map(([step, rating]) => `Step ${parseInt(step) + 1}: ${rating}`)
          .join('\n') || null
      })

      // End the session in store
      finishCooking()
      
      // Close the cooking view
      onClose()
      
      toast({
        title: "Cooking session completed",
        description: "Your progress has been saved to the recipe history.",
      })
    } catch (error) {
      console.error('Error recording cooking session:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save cooking session. Please try again.",
      })
    }
  }

  if (!recipe) return <></>

  const currentInstruction = instructions[currentStep]

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
                <span>{recipe.difficulty}</span>
              </div>
              <ActiveSessionButton recipeId={recipe.id} />
              <CookingHistoryList recipeId={recipe.id} />
            </div>
          </div>
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowStartOverDialog(true)}>
              Start Over
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
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
                    onClick={() => setServingMultiplier(Math.max(0.5, servingMultiplier - 0.5))}
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
                    onClick={() => setServingMultiplier(servingMultiplier + 0.5)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className={cn(
                      "transition-colors relative group min-h-[36px] rounded-lg",
                      ing.checked ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <div 
                      className="flex items-center gap-3 py-1.5 px-2 cursor-pointer"
                      onClick={() => {
                        const newIngredients = [...ingredients]
                        newIngredients[index] = {
                          ...ing,
                          checked: !ing.checked,
                        }
                        setIngredients(newIngredients)
                        // Save to session state
                        toggleIngredient(index, !ing.checked)
                      }}
                    >
                      <Checkbox
                        checked={ing.checked}
                        className="opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                      <span className={cn(
                        "flex-1",
                        ing.checked && "line-through text-muted-foreground"
                      )}>
                        {ing.amount * servingMultiplier} {ing.unit} {ing.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer Panel */}
            <div className="bg-card rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold mb-4">Timers</h2>

              {/* Running Timers */}
              {timers.filter(t => t.isActive).length > 0 && (
                <div className="space-y-2">
                  <Label>Running Timers</Label>
                  <div className="space-y-2">
                    {timers.filter(t => t.isActive).map(timer => (
                      <div
                        key={timer.id}
                        className="bg-muted rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {editingTimerId === timer.id ? (
                            <Input
                              value={editedTimerName}
                              onChange={(e) => setEditedTimerName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveTimerName(timer.id)
                                } else if (e.key === 'Escape') {
                                  setEditingTimerId(null)
                                  setEditedTimerName("")
                                }
                              }}
                              autoFocus
                              className="w-48"
                            />
                          ) : (
                            <p className="font-medium">{timer.name}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRenameTimer(timer.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTimer(timer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl tabular-nums">
                            {formatTime(timer.remaining)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => pauseTimer(timer.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => resetTimer(timer.id)}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Timers */}
              {timers.filter(t => !t.isActive).length > 0 && (
                <div className="space-y-2">
                  <Label>Paused Timers</Label>
                  <div className="space-y-2">
                    {timers.filter(t => !t.isActive).map(timer => (
                      <div
                        key={timer.id}
                        className="bg-muted/50 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {editingTimerId === timer.id ? (
                            <Input
                              value={editedTimerName}
                              onChange={(e) => setEditedTimerName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveTimerName(timer.id)
                                } else if (e.key === 'Escape') {
                                  setEditingTimerId(null)
                                  setEditedTimerName("")
                                }
                              }}
                              autoFocus
                              className="w-48"
                            />
                          ) : (
                            <p className="font-medium">{timer.name}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRenameTimer(timer.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTimer(timer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl tabular-nums">
                            {formatTime(timer.remaining)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => startTimer(timer.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => resetTimer(timer.id)}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Timer Presets */}
              <div className="space-y-2">
                <Label>Quick Timers</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TIMERS.map(({ duration }) => (
                    <Button
                      key={duration}
                      variant="outline"
                      size="sm"
                      onClick={() => addTimer(`${duration}m Timer`, duration * 60)}
                    >
                      <TimerIcon className="h-4 w-4 mr-2" />
                      {duration}m
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Timer */}
              <div className="space-y-2">
                <Label>Custom Timer</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Timer name"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget
                        if (input.value) {
                          addTimer(input.value, 5 * 60)
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector('input[type="text"]') as HTMLInputElement
                      if (input.value) {
                        addTimer(input.value, 5 * 60)
                        input.value = ''
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Instructions */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Instructions</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">
                    Step {currentStep + 1} of {instructions.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={!session || currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  {currentStep === instructions.length - 1 ? (
                    <Button 
                      onClick={handleFinishCooking}
                      disabled={!session}
                    >
                      Finish Cooking
                    </Button>
                  ) : (
                    <Button 
                      onClick={goToNextStep}
                      disabled={!session || currentStep >= instructions.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {instructions.slice(currentStep).map((instruction: string, index: number) => {
                  const actualStepIndex = currentStep + index;
                  return (
                    <div
                      key={actualStepIndex}
                      className={cn(
                        "transition-all duration-500 ease-out transform",
                        actualStepIndex === currentStep 
                          ? "bg-primary/10 scale-100 opacity-100 translate-y-0" 
                          : "hover:bg-muted/50 scale-[0.98] opacity-75 translate-y-2",
                        "rounded-lg p-4 cursor-pointer relative overflow-hidden"
                      )}
                      style={{
                        transitionDelay: `${index * 75}ms`,
                        transformOrigin: "center left"
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        if (session) {
                          setCurrentStep(actualStepIndex)
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleStepEdit(actualStepIndex)
                      }}
                    >
                      <div 
                        className={cn(
                          "absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent",
                          "transition-opacity duration-500",
                          actualStepIndex === currentStep ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex gap-4 relative">
                        <div className="flex-none flex flex-col items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-background border text-sm font-medium">
                            {actualStepIndex + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 transition-colors opacity-50 hover:opacity-100",
                                stepRatings[actualStepIndex] === 'up' && "opacity-100 text-green-500"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                rateStep(actualStepIndex, 'up')
                              }}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 transition-colors opacity-50 hover:opacity-100",
                                stepRatings[actualStepIndex] === 'down' && "opacity-100 text-red-500"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                rateStep(actualStepIndex, 'down')
                              }}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                            {notes[actualStepIndex] && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-50 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowNotes(showNotes === actualStepIndex ? null : actualStepIndex)
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          {editingStep === actualStepIndex ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editedStepText}
                                onChange={(e) => setEditedStepText(e.target.value)}
                                className="min-h-[100px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.metaKey) {
                                    handleStepSave()
                                  } else if (e.key === 'Escape') {
                                    setEditingStep(null)
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
                            <>
                              <p>{instruction}</p>
                              {showNotes === actualStepIndex && (
                                <div className="mt-4 relative">
                                  <div className="absolute right-0 top-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowNotes(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    placeholder="Add notes for this step..."
                                    value={notes[actualStepIndex] || ''}
                                    onChange={(e) => addNote(actualStepIndex, e.target.value)}
                                    className="mt-2"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
              <DialogTitle>Finish Cooking?</DialogTitle>
              <DialogDescription>
                You've reached the last step. Would you like to mark this recipe as completed?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  pauseCooking()
                  toast({
                    title: "Progress saved",
                    description: "Your cooking progress has been saved. You can resume later.",
                  })
                  onClose()
                }}
              >
                Save & Resume Later
              </Button>
              <Button
                onClick={() => {
                  finishCooking()
                  onClose()
                  toast({
                    title: "Recipe completed",
                    description: "Your cooking session has been saved to history.",
                  })
                }}
              >
                Mark as Completed
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 