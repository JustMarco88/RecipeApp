import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { type Recipe } from "@/types/recipe"
import { type RecipeIngredient } from "@/types/recipe"
import { trpc } from "@/utils/trpc"
import { X, ChevronLeft, ChevronRight, Clock, Flame, GaugeCircle, TimerIcon, Plus, Minus, Play, Pause, ChevronDown, ChevronUp, Trash2, History } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { type CookingHistory } from "@/types/recipe"

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
                    {formatDistanceToNow(new Date(session.completedAt))} ago
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
                onClick={() => {
                  if (confirm('Are you sure you want to delete this cooking session?')) {
                    deleteCookingSession.mutate(session.id)
                  }
                }}
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

export function CookingView({ recipe, onClose }: CookingViewProps): JSX.Element {
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
  const [startTime] = useState<Date>(new Date())
  const [timers, setTimers] = useState<Timer[]>([])
  const [newTimerName, setNewTimerName] = useState("")
  const [newTimerDuration, setNewTimerDuration] = useState(5)
  const [scale, setScale] = useState(1)
  const { toast } = useToast()

  const utils = trpc.useContext()

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
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      utils.recipe.getCookingHistory.invalidate(recipe.id)
      toast({
        title: "Success",
        description: "Cooking session completed!",
      })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to record cooking:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record cooking session",
      })
    },
  })

  const handleFinishCooking = async () => {
    try {
      const cookingData = {
        recipeId: recipe.id,
        startedAt: startTime,
        completedAt: new Date(),
        servingsCooked: servings,
        notes: notes,
        actualTime: Math.round((Date.now() - startTime.getTime()) / 1000 / 60), // minutes
      }

      console.log('Recording cooking session with data:', cookingData)
      await recordCooking.mutateAsync(cookingData)
    } catch (error) {
      console.error('Error finishing cooking session:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save cooking session",
      })
    }
  }

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

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Enhanced Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">{recipe.title}</h2>
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
          <Button variant="ghost" size="icon" onClick={onClose}>
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
              <ul className="space-y-3">
                {ingredients.map((ing, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={ing.checked}
                      onChange={() => toggleIngredient(index)}
                      className="h-5 w-5"
                    />
                    <span className={ing.checked ? "line-through text-muted-foreground" : ""}>
                      {ing.amount} {ing.unit} {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2">Cooking Notes</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your cooking experience..."
                className="min-h-[100px]"
              />
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
          </div>

          {/* Right Column - Instructions */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <div className="space-y-8">
                {instructions.map((step, index) => (
                  <div
                    key={index}
                    className={`space-y-2 ${
                      index === currentStep ? "bg-primary/10" : "hover:bg-muted/50"
                    } rounded transition-colors p-4`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-lg font-bold">
                        {index + 1}
                      </span>
                      <p className="flex-1">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                {currentStep === instructions.length - 1 ? (
                  <Button onClick={handleFinishCooking}>
                    Finish Cooking
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      setCurrentStep((prev) =>
                        Math.min(instructions.length - 1, prev + 1)
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
      </div>
    </div>
  )
} 