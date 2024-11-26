import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trpc } from "@/utils/trpc"
import { Timer as TimerIcon, ChevronLeft, ChevronRight, Play, Pause, X, Minus, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Timer {
  id: string
  name: string
  duration: number
  timeLeft: number
  isRunning: boolean
}

interface Ingredient {
  name: string
  amount: number
  unit: string
  checked: boolean
}

interface CookingViewProps {
  recipeId: string
  onClose: () => void
}

export function CookingView({ recipeId, onClose }: CookingViewProps) {
  const { data: recipe, isLoading } = trpc.recipe.getById.useQuery(recipeId)
  const [currentStep, setCurrentStep] = useState(0)
  const [servingMultiplier, setServingMultiplier] = useState(1)
  const [timers, setTimers] = useState<Timer[]>([])
  const [newTimerName, setNewTimerName] = useState("")
  const [newTimerDuration, setNewTimerDuration] = useState(5)
  const [startTime] = useState<Date>(new Date())
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const { toast } = useToast()
  const utils = trpc.useContext()

  const recordCooking = trpc.recipe.recordCooking.useMutation({
    onSuccess: () => {
      utils.recipe.getCookingHistory.invalidate()
      toast({
        title: "Success",
        description: "Cooking session recorded!",
      })
    },
  })

  useEffect(() => {
    if (recipe) {
      const parsedIngredients = JSON.parse(recipe.ingredients as string).map(
        (ing: Omit<Ingredient, "checked">) => ({
          ...ing,
          checked: false,
        })
      )
      setIngredients(parsedIngredients)
    }
  }, [recipe])

  const instructions = recipe ? JSON.parse(recipe.instructions as string) : []

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
    if (!newTimerName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a timer name",
      })
      return
    }
    const newTimer: Timer = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTimerName,
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

  const toggleIngredient = (index: number) => {
    setIngredients(prev =>
      prev.map((ing, i) =>
        i === index ? { ...ing, checked: !ing.checked } : ing
      )
    )
  }

  const adjustServings = (increment: boolean) => {
    setServingMultiplier(prev => {
      const newValue = increment ? prev + 0.5 : prev - 0.5
      return Math.max(0.5, newValue)
    })
  }

  const finishCooking = async () => {
    const completedAt = new Date()
    const actualTime = Math.round((completedAt.getTime() - startTime.getTime()) / 60000) // Convert to minutes
    
    await recordCooking.mutateAsync({
      recipeId,
      startedAt: startTime,
      completedAt,
      actualTime,
      servingsCooked: Math.round(recipe!.servings * servingMultiplier),
    })

    onClose()
  }

  if (isLoading || !recipe) {
    return <div>Loading recipe...</div>
  }

  const scaledIngredients = ingredients.map(ing => ({
    ...ing,
    amount: ing.amount * servingMultiplier,
  }))

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-[350px,1fr] gap-8">
          <div className="space-y-6">
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
                      {recipe.servings * servingMultiplier}
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
              <ul className="space-y-3">
                {scaledIngredients.map((ing, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={ing.checked}
                      onChange={() => toggleIngredient(index)}
                      className="h-5 w-5"
                    />
                    <span className={ing.checked ? "line-through text-muted-foreground" : ""}>
                      {ing.amount.toFixed(1)} {ing.unit} {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Timers</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Timer name"
                    value={newTimerName}
                    onChange={(e) => setNewTimerName(e.target.value)}
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Minutes"
                    value={newTimerDuration}
                    onChange={(e) => setNewTimerDuration(Number(e.target.value))}
                    className="w-24"
                  />
                  <Button onClick={addTimer}>Add</Button>
                </div>
                <div className="space-y-2">
                  {timers.map(timer => (
                    <div
                      key={timer.id}
                      className="flex items-center justify-between bg-muted p-2 rounded"
                    >
                      <span>{timer.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {formatTime(timer.timeLeft)}
                        </span>
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

          <div className="space-y-6">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center mb-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-center">
                Step {currentStep + 1} of {instructions.length}
              </span>
              {currentStep === instructions.length - 1 ? (
                <Button onClick={finishCooking} variant="default">
                  Finish Cooking
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentStep(prev => Math.min(instructions.length - 1, prev + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm min-h-[200px] text-xl mb-8">
              {instructions[currentStep]}
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-4">All Steps Overview</h3>
              <div className="space-y-4">
                {instructions.map((instruction: string, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      index === currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-card"
                    } cursor-pointer hover:bg-primary/90 hover:text-primary-foreground transition-colors`}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className="font-medium mb-1">Step {index + 1}</div>
                    <div className="text-sm">{instruction}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 