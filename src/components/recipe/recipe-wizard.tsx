import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, ChevronLeft, X, Wand2, PenLine, Plus, GripVertical, Loader2, Clock, Flame, GaugeCircle, Pencil, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from "@/utils/api"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type RecipeSuggestion } from "@/utils/ai"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

type WizardStep = 'name' | 'method' | 'manual-ingredients' | 'manual-instructions' | 'manual-details' | 'ai-requirements' | 'ai-review' | 'ai' | 'generating-image' | 'saving'

interface Ingredient {
  name: string
  amount: number
  unit: string
}

interface RecipeWizardProps {
  onClose: () => void
  onSuccess?: () => void
}

interface SortableInstructionItemProps {
  instruction: string
  index: number
  onEdit: () => void
  onDelete: () => void
}

function SortableInstructionItem({ instruction, index, onEdit, onDelete }: SortableInstructionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index.toString() })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex gap-4 items-start p-3 rounded-lg hover:bg-muted/50",
        isDragging && "bg-muted/50 cursor-grabbing"
      )}
    >
      <button
        className="flex-none cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
          {index + 1}
        </div>
      </button>
      <div className="flex-1 space-y-2">
        <p>{instruction}</p>
      </div>
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function RecipeWizard({ onClose, onSuccess }: RecipeWizardProps) {
  const { toast } = useToast()
  const utils = api.useContext()
  const [step, setStep] = useState<WizardStep>('name')
  const [recipeName, setRecipeName] = useState("")
  const [aiRequirements, setAiRequirements] = useState({
    servings: 4,
    dietaryRestrictions: [] as string[],
    preferences: "",
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard'
  })
  const [aiSuggestion, setAiSuggestion] = useState<RecipeSuggestion | null>(null)
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editedStepText, setEditedStepText] = useState("")
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null)
  const [editedIngredient, setEditedIngredient] = useState<Ingredient>({
    name: "",
    amount: 0,
    unit: ""
  })
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const createRecipe = api.recipe.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your recipe has been created.",
      })
      utils.recipe.getAll.invalidate()
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const getSuggestions = api.recipe.getSuggestions.useMutation({
    onSuccess: (data) => {
      const suggestion = data as RecipeSuggestion
      setAiSuggestion(suggestion)
      setStep('ai-review')
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      setStep('ai-requirements')
    }
  })

  const handleSubmit = () => {
    if (!aiSuggestion) return

    if (shouldGenerateImage) {
      setStep('generating-image')
      generateImage.mutate({
        title: recipeName,
        ingredients: aiSuggestion.ingredients,
        cuisineType: aiSuggestion.cuisineType,
      })
    } else {
      setStep('saving')
      createRecipe.mutate({
        title: recipeName,
        ingredients: JSON.stringify(aiSuggestion.ingredients),
        instructions: JSON.stringify(aiSuggestion.instructions),
        prepTime: aiSuggestion.prepTime,
        cookTime: aiSuggestion.cookTime,
        servings: aiRequirements.servings,
        difficulty: aiSuggestion.difficulty,
        cuisineType: aiSuggestion.cuisineType || undefined,
        tags: aiSuggestion.tags,
        imageUrl: undefined,
        nutrition: undefined,
      })
    }
  }

  const generateImage = api.recipe.generateImage.useMutation({
    onSuccess: (data) => {
      if (!aiSuggestion) return

      setStep('saving')
      // Create recipe with the generated image URL
      createRecipe.mutate({
        title: recipeName,
        ingredients: JSON.stringify(aiSuggestion.ingredients),
        instructions: JSON.stringify(aiSuggestion.instructions),
        prepTime: aiSuggestion.prepTime,
        cookTime: aiSuggestion.cookTime,
        servings: aiRequirements.servings,
        difficulty: aiSuggestion.difficulty,
        cuisineType: aiSuggestion.cuisineType || undefined,
        tags: aiSuggestion.tags,
        imageUrl: data.imageUrl || undefined,
        nutrition: undefined,
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate image. Creating recipe without image.",
        variant: "destructive",
      })
      
      if (!aiSuggestion) return

      setStep('saving')
      // Fallback to creating recipe without image
      createRecipe.mutate({
        title: recipeName,
        ingredients: JSON.stringify(aiSuggestion.ingredients),
        instructions: JSON.stringify(aiSuggestion.instructions),
        prepTime: aiSuggestion.prepTime,
        cookTime: aiSuggestion.cookTime,
        servings: aiRequirements.servings,
        difficulty: aiSuggestion.difficulty,
        cuisineType: aiSuggestion.cuisineType || undefined,
        tags: aiSuggestion.tags,
        imageUrl: undefined,
        nutrition: undefined,
      })
    }
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString())
      const newIndex = parseInt(over.id.toString())
      
      setAiSuggestion(prev => {
        if (!prev) return prev
        return {
          ...prev,
          instructions: arrayMove(prev.instructions, oldIndex, newIndex)
        }
      })
    }
  }

  const handleAddInstruction = () => {
    if (!aiSuggestion) return
    
    const newInstructions = [...aiSuggestion.instructions]
    newInstructions.push("")
    setAiSuggestion({
      ...aiSuggestion,
      instructions: newInstructions
    })
    setEditingStep(newInstructions.length - 1)
    setEditedStepText("")
  }

  const handleAddIngredient = () => {
    if (!aiSuggestion) return
    
    setEditedIngredient({
      name: "",
      amount: 0,
      unit: ""
    })
    setEditingIngredient(-1)
  }

  const renderIngredientEditForm = (
    index: number,
    onSave: (ingredient: Ingredient) => void,
    onCancel: () => void
  ) => (
    <div className="flex-1 space-y-2 p-2 bg-muted/50 rounded-lg">
      <div className="grid grid-cols-[100px,100px,1fr] gap-2">
        <Input
          type="number"
          value={editedIngredient.amount}
          onChange={(e) => setEditedIngredient(prev => ({
            ...prev,
            amount: parseFloat(e.target.value) || 0
          }))}
          placeholder="Amount"
        />
        <Input
          value={editedIngredient.unit}
          onChange={(e) => setEditedIngredient(prev => ({
            ...prev,
            unit: e.target.value
          }))}
          placeholder="Unit"
        />
        <Input
          value={editedIngredient.name}
          onChange={(e) => setEditedIngredient(prev => ({
            ...prev,
            name: e.target.value
          }))}
          placeholder="Ingredient name"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(editedIngredient)}
          disabled={!editedIngredient.name || editedIngredient.amount <= 0}
        >
          Save
        </Button>
      </div>
    </div>
  )

  const renderInstructionEditForm = (
    index: number,
    onSave: (text: string) => void,
    onCancel: () => void
  ) => (
    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
      <Textarea
        value={editedStepText}
        onChange={(e) => setEditedStepText(e.target.value)}
        className="min-h-[100px] resize-none"
        placeholder="Enter instruction step..."
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(editedStepText)}
          disabled={!editedStepText.trim()}
        >
          Save
        </Button>
      </div>
    </div>
  )

  const goToNextStep = useCallback(() => {
    switch (step) {
      case 'name':
        setStep('method')
        break
      case 'method':
        // Will be handled by the method selection buttons
        break
      case 'ai-requirements':
        setStep('ai')
        getSuggestions.mutate({
          title: recipeName,
          isImprovement: false,
          requirements: aiRequirements
        })
        break
    }
  }, [step, recipeName, aiRequirements, getSuggestions])

  const goToPreviousStep = () => {
    switch (step) {
      case 'method':
        setStep('name')
        break
      case 'ai-requirements':
        setStep('method')
        break
      case 'ai-review':
        setStep('ai-requirements')
        break
    }
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'name' && recipeName.trim()) {
        goToNextStep()
      }
    }
  }, [step, recipeName, goToNextStep])

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 bg-background">
        {step === 'name' && (
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Create New Recipe</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Let's start with a name for your recipe
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-card rounded-lg p-6">
              <div className="max-w-xl mx-auto space-y-4">
                <h3 className="text-lg font-medium text-center mb-6">
                  What recipe do you want to make?
                </h3>
                <Input
                  placeholder="Enter recipe name..."
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-lg"
                  autoFocus
                />
                <Button
                  onClick={goToNextStep}
                  disabled={!recipeName.trim()}
                  className="w-full mt-4"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'method' && (
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Create {recipeName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  How would you like to create this recipe?
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                className={cn(
                  "bg-card hover:bg-accent rounded-lg p-6 text-left transition-colors",
                  "group relative overflow-hidden"
                )}
                onClick={() => setStep('manual-ingredients')}
              >
                <div className="relative z-10">
                  <PenLine className="h-8 w-8 mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">I'll write it myself</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your recipe step by step, with full control over ingredients and instructions.
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                className={cn(
                  "bg-card hover:bg-accent rounded-lg p-6 text-left transition-colors",
                  "group relative overflow-hidden"
                )}
                onClick={() => setStep('ai-requirements')}
              >
                <div className="relative z-10">
                  <Wand2 className="h-8 w-8 mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">Help me with AI</h3>
                  <p className="text-sm text-muted-foreground">
                    Let AI generate a recipe based on your preferences and requirements.
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        )}

        {step === 'ai-requirements' && (
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Create {recipeName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Let's customize your recipe
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-card rounded-lg p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Number of Servings</label>
                    <Input
                      type="number"
                      value={aiRequirements.servings}
                      onChange={(e) => setAiRequirements(prev => ({
                        ...prev,
                        servings: parseInt(e.target.value) || 4
                      }))}
                      min={1}
                      max={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dietary Restrictions</label>
                    <Select
                      value={aiRequirements.dietaryRestrictions.join(",")}
                      onValueChange={(value) => setAiRequirements(prev => ({
                        ...prev,
                        dietaryRestrictions: value.split(",").filter(Boolean)
                      }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select restrictions..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="gluten-free">Gluten Free</SelectItem>
                        <SelectItem value="dairy-free">Dairy Free</SelectItem>
                        <SelectItem value="nut-free">Nut Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preferences & Notes</label>
                    <Textarea
                      placeholder="Any specific preferences? (e.g., 'Extra moist', 'Less sugar', 'Traditional style')"
                      value={aiRequirements.preferences}
                      onChange={(e) => setAiRequirements(prev => ({
                        ...prev,
                        preferences: e.target.value
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty Level</label>
                    <Select
                      value={aiRequirements.difficulty}
                      onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => setAiRequirements(prev => ({
                        ...prev,
                        difficulty: value
                      }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    disabled={getSuggestions.isLoading}
                  >
                    {getSuggestions.isLoading ? "Generating..." : "Generate Recipe"}
                    {!getSuggestions.isLoading && <ChevronRight className="h-4 w-4 ml-2" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'ai' && (
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="bg-card rounded-lg p-6">
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center">
                  <Wand2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-medium">
                    Generating recipe for {recipeName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Our AI is creating a detailed recipe based on your preferences. This might take a moment...
                  </p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'ai-review' && aiSuggestion && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b">
              <div className="container py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousStep}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h2 className="text-lg font-semibold">{recipeName}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Prep: {aiSuggestion.prepTime}min</span>
                      <span>•</span>
                      <Flame className="h-4 w-4" />
                      <span>Cook: {aiSuggestion.cookTime}min</span>
                      <span>•</span>
                      <GaugeCircle className="h-4 w-4" />
                      <span>{aiSuggestion.difficulty}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <Checkbox
                      id="generate-image"
                      checked={shouldGenerateImage}
                      onCheckedChange={(checked) => setShouldGenerateImage(checked as boolean)}
                    />
                    <label
                      htmlFor="generate-image"
                      className="text-sm cursor-pointer select-none flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Generate AI image
                    </label>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    className="gap-2"
                  >
                    Create Recipe
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              <div className="container h-full py-6">
                <div className="grid grid-cols-[300px,1fr] gap-6 h-full">
                  {/* Left Sidebar - Ingredients */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Ingredients</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {aiRequirements.servings} servings
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddIngredient}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Ingredient
                      </Button>
                    </div>
                    <ScrollArea className="h-[calc(100vh-220px)]">
                      <div className="space-y-2 pr-4">
                        {aiSuggestion.ingredients.map((ing, index) => (
                          <div key={index} className="group flex items-start gap-2 text-sm">
                            {editingIngredient === index ? (
                              renderIngredientEditForm(
                                index,
                                (ingredient) => {
                                  const newIngredients = [...aiSuggestion.ingredients]
                                  if (editingIngredient === -1) {
                                    newIngredients.push(ingredient)
                                  } else {
                                    newIngredients[editingIngredient] = ingredient
                                  }
                                  setAiSuggestion({
                                    ...aiSuggestion,
                                    ingredients: newIngredients
                                  })
                                  setEditingIngredient(null)
                                },
                                () => setEditingIngredient(null)
                              )
                            ) : (
                              <>
                                <div className="flex-1">
                                  {ing.amount} {ing.unit} {ing.name}
                                </div>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditedIngredient(ing)
                                      setEditingIngredient(index)
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => {
                                      const newIngredients = [...aiSuggestion.ingredients]
                                      newIngredients.splice(index, 1)
                                      setAiSuggestion({
                                        ...aiSuggestion,
                                        ingredients: newIngredients
                                      })
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {editingIngredient === -1 && (
                          renderIngredientEditForm(
                            -1,
                            (ingredient) => {
                              setAiSuggestion({
                                ...aiSuggestion,
                                ingredients: [...aiSuggestion.ingredients, ingredient]
                              })
                              setEditingIngredient(null)
                            },
                            () => setEditingIngredient(null)
                          )
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Main Content - Instructions */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Instructions</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Drag and drop to reorder steps
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddInstruction}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Step
                      </Button>
                    </div>
                    <ScrollArea className="h-[calc(100vh-220px)]">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={aiSuggestion.instructions.map((_, i) => i.toString())}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4 pr-4">
                            {aiSuggestion.instructions.map((instruction, index) => (
                              editingStep === index ? (
                                <div key={index}>
                                  {renderInstructionEditForm(
                                    index,
                                    (text) => {
                                      const newInstructions = [...aiSuggestion.instructions]
                                      if (editingStep === -1) {
                                        newInstructions.push(text)
                                      } else {
                                        newInstructions[editingStep] = text
                                      }
                                      setAiSuggestion({
                                        ...aiSuggestion,
                                        instructions: newInstructions
                                      })
                                      setEditingStep(null)
                                    },
                                    () => setEditingStep(null)
                                  )}
                                </div>
                              ) : (
                                <SortableInstructionItem
                                  key={index}
                                  instruction={instruction}
                                  index={index}
                                  onEdit={() => {
                                    setEditedStepText(instruction)
                                    setEditingStep(index)
                                  }}
                                  onDelete={() => {
                                    const newInstructions = [...aiSuggestion.instructions]
                                    newInstructions.splice(index, 1)
                                    setAiSuggestion({
                                      ...aiSuggestion,
                                      instructions: newInstructions
                                    })
                                  }}
                                />
                              )
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'generating-image' && (
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="bg-card rounded-lg p-6">
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center">
                  <Wand2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-medium">
                    Generating image for {recipeName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Our AI is creating a beautiful image for your recipe. This might take a moment...
                  </p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="container mx-auto p-4 max-w-6xl">
            <div className="bg-card rounded-lg p-6">
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                  <h3 className="text-lg font-medium">
                    Saving your recipe
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Almost done! We're saving your recipe...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 