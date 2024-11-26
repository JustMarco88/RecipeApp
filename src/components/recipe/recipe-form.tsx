import { useState } from "react"
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
import { Plus, Minus } from "lucide-react"
import { DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Ingredient {
  name: string
  amount: number
  unit: string
}

type Difficulty = "Easy" | "Medium" | "Hard"

export function RecipeForm() {
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

  const utils = trpc.useContext()
  const createRecipe = trpc.recipe.create.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
    },
  })

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
      [field]: field === "amount" ? Number(value) : value,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate ingredients
    if (ingredients.some(ing => !ing.name || !ing.unit)) {
      setError("Please fill in all ingredient fields")
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all ingredient fields",
      })
      return
    }

    // Validate instructions
    if (instructions.some(inst => !inst.trim())) {
      setError("Please fill in all instruction steps")
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all instruction steps",
      })
      return
    }

    try {
      await createRecipe.mutateAsync({
        title,
        ingredients: ingredients.map(ing => ({
          ...ing,
          amount: Number(ing.amount),
        })),
        instructions: instructions.filter(inst => inst.trim()),
        prepTime,
        cookTime,
        servings,
        difficulty,
        cuisineType,
        tags,
      })
      resetForm()
      toast({
        title: "Success",
        description: "Recipe created successfully",
      })
    } catch (error) {
      console.error("Error creating recipe:", error)
      setError("Failed to create recipe. Please try again.")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create recipe. Please try again.",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recipe title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Ingredients</label>
        {ingredients.map((ingredient, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={ingredient.name}
              onChange={(e) =>
                updateIngredient(index, "name", e.target.value)
              }
              placeholder="Ingredient name"
              className="flex-1"
              required
            />
            <Input
              type="number"
              value={ingredient.amount}
              onChange={(e) =>
                updateIngredient(index, "amount", e.target.value)
              }
              placeholder="Amount"
              className="w-24"
              required
              min="0"
              step="0.1"
            />
            <Input
              value={ingredient.unit}
              onChange={(e) =>
                updateIngredient(index, "unit", e.target.value)
              }
              placeholder="Unit"
              className="w-24"
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeIngredient(index)}
              disabled={ingredients.length === 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Instructions</label>
        {instructions.map((instruction, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Textarea
              value={instruction}
              onChange={(e) => updateInstruction(index, e.target.value)}
              placeholder={`Step ${index + 1}`}
              className="flex-1"
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeInstruction(index)}
              disabled={instructions.length === 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addInstruction}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Prep Time (minutes)</label>
          <Input
            type="number"
            value={prepTime}
            onChange={(e) => setPrepTime(Number(e.target.value))}
            min="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Cook Time (minutes)</label>
          <Input
            type="number"
            value={cookTime}
            onChange={(e) => setCookTime(Number(e.target.value))}
            min="0"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Servings</label>
          <Input
            type="number"
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Difficulty</label>
          <Select value={difficulty} onValueChange={(value: Difficulty) => setDifficulty(value)}>
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
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Cuisine Type</label>
        <Input
          value={cuisineType}
          onChange={(e) => setCuisineType(e.target.value)}
          placeholder="e.g., Italian, Japanese, Mexican"
        />
      </div>

      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">
          Create Recipe
        </Button>
      </div>
    </form>
  )
} 