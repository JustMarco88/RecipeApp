import { useState } from "react"
import { trpc } from "@/utils/trpc"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RecipeForm } from "./recipe-form"
import { CookingView } from "./cooking-view"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, ChefHat, History, Search, X, Plus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { type Recipe, type CookingHistory, type RecipeWithHistory } from "@/types/recipe"

export function RecipeList() {
  const { data: recipes, isLoading } = trpc.recipe.getAll.useQuery(undefined, {
    refetchOnWindowFocus: true,
  })
  const { toast } = useToast()
  const utils = trpc.useContext()
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [cookingViewRecipe, setCookingViewRecipe] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const deleteRecipe = trpc.recipe.delete.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      })
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete recipe",
      })
    },
  })

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      await deleteRecipe.mutateAsync(id)
    }
  }

  const searchInIngredients = (recipe: RecipeWithHistory, searchTerms: string[]) => {
    try {
      const ingredients = JSON.parse(recipe.ingredients)
      return searchTerms.every(term =>
        ingredients.some((ing: { name: string }) =>
          ing.name.toLowerCase().includes(term)
        )
      )
    } catch (error) {
      console.error('Error parsing ingredients:', error)
      return false
    }
  }

  const searchInInstructions = (recipe: RecipeWithHistory, searchTerms: string[]) => {
    try {
      const instructions = JSON.parse(recipe.instructions)
      return searchTerms.every(term =>
        instructions.some((instruction: string) =>
          instruction.toLowerCase().includes(term)
        )
      )
    } catch (error) {
      console.error('Error parsing instructions:', error)
      return false
    }
  }

  const filteredRecipes = (recipes as RecipeWithHistory[] | undefined)?.filter(recipe => {
    if (!searchQuery.trim()) return true

    const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    
    // Search in title
    if (searchTerms.every(term => recipe.title.toLowerCase().includes(term))) {
      return true
    }

    // Search in ingredients
    if (searchInIngredients(recipe, searchTerms)) {
      return true
    }

    // Search in instructions
    if (searchInInstructions(recipe, searchTerms)) {
      return true
    }

    // Search in cuisine type
    if (recipe.cuisineType && searchTerms.every(term => 
      recipe.cuisineType?.toLowerCase().includes(term)
    )) {
      return true
    }

    // Search in tags
    if (searchTerms.every(term =>
      recipe.tags.some(tag => tag.toLowerCase().includes(term))
    )) {
      return true
    }

    return false
  })

  if (isLoading) {
    return <div>Loading recipes...</div>
  }

  if (!recipes) {
    return <div>No recipes found</div>
  }

  if (cookingViewRecipe) {
    return (
      <CookingView
        recipeId={cookingViewRecipe}
        onClose={() => setCookingViewRecipe(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Recipes</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
              <DialogDescription>
                Add a new recipe to your collection
              </DialogDescription>
            </DialogHeader>
            <RecipeForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes by title, ingredients, instructions..."
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {filteredRecipes?.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No recipes found matching "{searchQuery}"
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes?.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={() => setSelectedRecipe(recipe.id)}
              onDelete={() => handleDelete(recipe.id)}
              onCook={() => setCookingViewRecipe(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface RecipeCardProps {
  recipe: RecipeWithHistory
  onEdit: () => void
  onDelete: () => void
  onCook: () => void
}

function RecipeCard({ recipe, onEdit, onDelete, onCook }: RecipeCardProps) {
  const { data: history } = trpc.recipe.getCookingHistory.useQuery(recipe.id)
  const lastCooked = history?.[0]

  return (
    <div className="p-4 border rounded-lg shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{recipe.title}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onCook}>
            <ChefHat className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Recipe</DialogTitle>
                <DialogDescription>
                  Modify your recipe details
                </DialogDescription>
              </DialogHeader>
              <RecipeForm recipeId={recipe.id} />
            </DialogContent>
          </Dialog>
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>Prep: {recipe.prepTime}min • Cook: {recipe.cookTime}min</p>
        <p>Difficulty: {recipe.difficulty}</p>
        {lastCooked && (
          <div className="flex items-center gap-2 text-xs">
            <History className="h-3 w-3" />
            <span>
              Last cooked: {formatDistanceToNow(new Date(lastCooked.completedAt))} ago
              ({lastCooked.servingsCooked} servings)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}