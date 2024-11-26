import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/utils/trpc"
import { Plus, Minus, ImagePlus, X } from "lucide-react"
import { DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { type Ingredient } from "@/types/recipe"

type Difficulty = "Easy" | "Medium" | "Hard"

interface RecipeFormProps {
  recipeId?: string
  onError?: (error: string | null) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function RecipeForm({ recipeId }: RecipeFormProps) {
  const [title, setTitle] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", amount: 0, unit: "" },
  ])
  const [instructions, setInstructions] = useState<string[]>([""])
  const [prepTime, setPrepTime] = useState(0)
  const [cookTime, setCookTime] = useState(0)
  const [servings, setServings] = useState(1)
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy")
  const [cuisineType, setCuisineType] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const utils = trpc.useContext()
  
  const { data: existingRecipe } = trpc.recipe.getById.useQuery(recipeId ?? "", {
    enabled: !!recipeId,
  })

  const createRecipe = trpc.recipe.create.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Recipe created successfully",
      })
    },
  })

  const updateRecipe = trpc.recipe.update.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Recipe updated successfully",
      })
    },
  })

  useEffect(() => {
    if (existingRecipe) {
      try {
        setTitle(existingRecipe.title)
        const parsedIngredients = JSON.parse(existingRecipe.ingredients)
        if (Array.isArray(parsedIngredients)) {
          setIngredients(parsedIngredients.map(ing => ({
            name: String(ing.name || ''),
            amount: Number(ing.amount || 0),
            unit: String(ing.unit || ''),
          })))
        }
        const parsedInstructions = JSON.parse(existingRecipe.instructions)
        if (Array.isArray(parsedInstructions)) {
          setInstructions(parsedInstructions.map(String))
        }
        setPrepTime(existingRecipe.prepTime)
        setCookTime(existingRecipe.cookTime)
        setServings(existingRecipe.servings)
        setDifficulty(existingRecipe.difficulty as Difficulty)
        setCuisineType(existingRecipe.cuisineType ?? "")
        setTags(existingRecipe.tags)
        if (existingRecipe.imageUrl) {
          setImageUrl(existingRecipe.imageUrl)
        }
      } catch (error) {
        console.error('Error parsing recipe data:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load recipe data",
        })
      }
    }
  }, [existingRecipe, toast])

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: 0, unit: "" }])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string | number
  ) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: field === "amount" ? Number(value) || 0 : value,
    }
    setIngredients(newIngredients)
  }

  const addInstruction = () => {
    setInstructions([...instructions, ""])
  }

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index))
    }
  }

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...instructions]
    newInstructions[index] = value
    setInstructions(newInstructions)
  }

  const resetForm = () => {
    setTitle("")
    setIngredients([{ name: "", amount: 0, unit: "" }])
    setInstructions([""])
    setPrepTime(0)
    setCookTime(0)
    setServings(1)
    setDifficulty("Easy")
    setCuisineType("")
    setTags([])
    setError(null)
  }

  const validateForm = () => {
    if (!title.trim()) {
      onError?.("Please enter a recipe title")
      return false
    }

    if (ingredients.some(ing => !ing.name.trim() || !ing.unit.trim())) {
      onError?.("Please fill in all ingredient fields")
      return false
    }

    if (ingredients.some(ing => ing.amount <= 0)) {
      onError?.("Ingredient amounts must be greater than 0")
      return false
    }

    if (instructions.some(inst => !inst.trim())) {
      onError?.("Please fill in all instruction steps")
      return false
    }

    if (prepTime < 0 || cookTime < 0) {
      onError?.("Prep and cook times cannot be negative")
      return false
    }

    if (servings <= 0) {
      onError?.("Number of servings must be greater than 0")
      return false
    }

    onError?.(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onError?.(null)

    if (!validateForm()) {
      return
    }

    const recipeData = {
      title: title.trim(),
      ingredients: ingredients.map(ing => ({
        name: ing.name.trim(),
        amount: Number(ing.amount),
        unit: ing.unit.trim(),
      })),
      instructions: instructions.map(inst => inst.trim()).filter(Boolean),
      prepTime: Math.max(0, prepTime),
      cookTime: Math.max(0, cookTime),
      servings: Math.max(1, servings),
      difficulty,
      cuisineType: cuisineType.trim(),
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      imageUrl: imageUrl || undefined,
    }

    try {
      if (recipeId) {
        await updateRecipe.mutateAsync({
          id: recipeId,
          data: recipeData,
        })
      } else {
        await createRecipe.mutateAsync(recipeData)
        resetForm()
      }
      const dialogClose = document.querySelector('[data-dialog-close]') as HTMLButtonElement
      if (dialogClose) {
        dialogClose.click()
      }
    } catch (error) {
      console.error("Error saving recipe:", error)
      onError?.("Failed to save recipe. Please try again.")
    }
  }

  const validateImage = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "Image size must be less than 5MB"
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Only JPEG, PNG and WebP images are allowed"
    }
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setImageError(null)

    if (file) {
      const error = validateImage(file)
      if (error) {
        setImageError(error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        })
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl("")
    setImageFile(null)
    setImageError(null)
  }

  const NumberInput = ({ 
    value, 
    onChange, 
    label, 
    min = 0,
    step = 1,
    className = ""
  }: { 
    value: number
    onChange: (value: number) => void
    label: string
    min?: number
    step?: number
    className?: string
  }) => (
    <div className={className}>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-semibold">{value}</span>
          <span className="text-sm text-muted-foreground ml-2">
            {label.toLowerCase().includes('time') ? 'min' : 'servings'}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value + step)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="relative group mb-6">
          <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
            {imageUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={imageUrl}
                  alt="Recipe preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImagePlus className="h-12 w-12" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${imageUrl ? 'bg-black/50' : ''}`}
                >
                  {imageUrl ? "Change Image" : "Add Image"}
                </Button>
              </label>
            </div>
          </div>
          {imageError && (
            <p className="text-sm text-destructive mt-2">{imageError}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Click to {imageUrl ? "change" : "add"} recipe image (max 5MB, JPEG/PNG/WebP)
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-lg font-semibold mb-2 block">Recipe Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter recipe title"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="Prep Time"
              value={prepTime}
              onChange={setPrepTime}
              min={0}
              step={5}
            />
            <NumberInput
              label="Cook Time"
              value={cookTime}
              onChange={setCookTime}
              min={0}
              step={5}
            />
            <NumberInput
              label="Servings"
              value={servings}
              onChange={setServings}
              min={1}
            />
          </div>

          <div>
            <label className="text-lg font-semibold mb-4 block">Ingredients</label>
            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(index, "name", e.target.value)
                      }
                      placeholder="Ingredient name"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={ingredient.amount}
                      onChange={(e) =>
                        updateIngredient(index, "amount", e.target.value)
                      }
                      placeholder="Amount"
                      required
                      min="0"
                      step="any"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      value={ingredient.unit}
                      onChange={(e) =>
                        updateIngredient(index, "unit", e.target.value)
                      }
                      placeholder="Unit"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>
          </div>

          <div>
            <label className="text-lg font-semibold mb-4 block">Instructions</label>
            <div className="space-y-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    disabled={instructions.length <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addInstruction}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </div>

          <div>
            <label className="text-lg font-semibold mb-2 block">Difficulty</label>
            <Select
              value={difficulty}
              onValueChange={(value: Difficulty) => setDifficulty(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-lg font-semibold mb-2 block">Cuisine Type</label>
            <Input
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g., Italian, Mexican, etc."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={createRecipe.isLoading || updateRecipe.isLoading}>
              {recipeId ? (
                updateRecipe.isLoading ? "Updating..." : "Update Recipe"
              ) : (
                createRecipe.isLoading ? "Creating..." : "Create Recipe"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
} 