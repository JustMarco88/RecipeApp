import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/utils/trpc"
import { Timer, ChevronLeft, ChevronRight, Play, Pause, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Timer {
  id: string
  name: string
  duration: number
  timeLeft: number
  isRunning: boolean
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
  const { toast } = useToast()

  const instructions = recipe ? JSON.parse(recipe.instructions as string) : []
  const ingredients = recipe ? JSON.parse(recipe.ingredients as string) : []

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

  const addTimer = (duration: number, name: string) => {
    const newTimer: Timer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      duration,
      timeLeft: duration,
      isRunning: true,
    }
    setTimers(prev => [...prev, newTimer])
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

  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  if (isLoading || !recipe) {
    return <div>Loading recipe...</div>
  }

  const scaledIngredients = ingredients.map((ing: any) => ({
    ...ing,
    amount: ing.amount * servingMultiplier,
  }))

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="grid md:grid-cols-[300px,1fr] gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
              <div className="mb-4">
                <label className="block text-sm mb-2">
                  Servings (Original: {recipe.servings})
                </label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={servingMultiplier}
                  onChange={(e) => setServingMultiplier(Number(e.target.value))}
                  className="w-20 p-1 border rounded"
                />
              </div>
              <ul className="space-y-2">
                {scaledIngredients.map((ing: any, index: number) => (
                  <li key={index}>
                    {ing.amount} {ing.unit} {ing.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Timers</h2>
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

          <div className="space-y-6">
            <div className="text-center mb-4">
              Step {currentStep + 1} of {instructions.length}
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm min-h-[200px] text-xl">
              {instructions[currentStep]}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                variant="outline"
                onClick={() => addTimer(300, `Timer ${timers.length + 1}`)}
              >
                <Timer className="h-4 w-4 mr-2" />
                Add Timer
              </Button>

              <Button
                onClick={nextStep}
                disabled={currentStep === instructions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 