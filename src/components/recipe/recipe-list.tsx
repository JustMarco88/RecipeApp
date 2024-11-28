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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RecipeForm } from "./recipe-form"
import { CookingView } from "./cooking-view"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, ChefHat, History, Search, X, Plus, ImagePlus, Clock, Flame, GaugeCircle, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { type Recipe, type CookingHistory, type RecipeWithHistory } from "@/types/recipe"

type SortOption = {
  value: string
  label: string
  sortFn: (a: RecipeWithHistory, b: RecipeWithHistory) => number
}

const sortOptions: SortOption[] = [
  {
    value: "newest",
    label: "Newly Added",
    sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  },
  {
    value: "lastCooked",
    label: "Recently Cooked",
    sortFn: (a, b) => {
      const aLastCooked = a.cookingHistory?.[0]?.completedAt
      const bLastCooked = b.cookingHistory?.[0]?.completedAt
      if (!aLastCooked && !bLastCooked) return 0
      if (!aLastCooked) return 1
      if (!bLastCooked) return -1
      return new Date(bLastCooked).getTime() - new Date(aLastCooked).getTime()
    },
  },
  {
    value: "leastCooked",
    label: "Least Recently Cooked",
    sortFn: (a, b) => {
      const aLastCooked = a.cookingHistory?.[0]?.completedAt
      const bLastCooked = b.cookingHistory?.[0]?.completedAt
      if (!aLastCooked && !bLastCooked) return 0
      if (!aLastCooked) return -1
      if (!bLastCooked) return 1
      return new Date(aLastCooked).getTime() - new Date(bLastCooked).getTime()
    },
  },
  {
    value: "mostCooked",
    label: "Most Cooked",
    sortFn: (a, b) => (b.cookingHistory?.length || 0) - (a.cookingHistory?.length || 0),
  },
  {
    value: "quickest",
    label: "Quickest to Make",
    sortFn: (a, b) => (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime),
  },
  {
    value: "alphabetical",
    label: "Alphabetical",
    sortFn: (a, b) => a.title.localeCompare(b.title),
  },
]

interface ActiveSession extends CookingHistory {
  recipe: Recipe;
}

export function RecipeList() {
  const { data: recipes, isLoading } = trpc.recipe.getAll.useQuery(undefined, {
    refetchOnWindowFocus: true,
  })
  const { data: activeSessions } = trpc.recipe.getActiveSessions.useQuery()
  const { toast } = useToast()
  const utils = trpc.useContext()
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [cookingViewRecipe, setCookingViewRecipe] = useState<{recipe: Recipe, skipResumeDialog?: boolean} | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const [sortBy, setSortBy] = useState<string>("newest")

  const deleteRecipe = trpc.recipe.delete.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      })
      setRecipeToDelete(null)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete recipe",
      })
    },
  })

  const handleDelete = async (recipe: Recipe) => {
    setRecipeToDelete(recipe)
  }

  const confirmDelete = async () => {
    if (recipeToDelete) {
      await deleteRecipe.mutateAsync(recipeToDelete.id)
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

  const sortedAndFilteredRecipes = (recipes as RecipeWithHistory[] | undefined)
    ?.filter(recipe => {
      if (!searchQuery.trim()) return true
      const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
      return (
        searchTerms.every(term => recipe.title.toLowerCase().includes(term)) ||
        searchInIngredients(recipe, searchTerms) ||
        searchInInstructions(recipe, searchTerms) ||
        (recipe.cuisineType && searchTerms.every(term => recipe.cuisineType?.toLowerCase().includes(term))) ||
        searchTerms.every(term => recipe.tags.some(tag => tag.toLowerCase().includes(term)))
      )
    })
    .sort(sortOptions.find(option => option.value === sortBy)?.sortFn)

  if (isLoading) {
    return <div>Loading recipes...</div>
  }

  if (!recipes) {
    return <div>No recipes found</div>
  }

  if (cookingViewRecipe) {
    return (
      <CookingView
        recipe={cookingViewRecipe.recipe}
        skipResumeDialog={cookingViewRecipe.skipResumeDialog}
        onClose={() => {
          setCookingViewRecipe(null)
          utils.recipe.getAll.invalidate()
        }}
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
          <DialogContent className="max-h-[90vh] max-w-[90vw] w-[800px] overflow-y-auto">
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

      {/* Active Cooking Sessions */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Active Cooking Sessions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSessions.map((session: ActiveSession) => (
              <div 
                key={session.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group cursor-pointer"
                onClick={() => setCookingViewRecipe({ recipe: session.recipe, skipResumeDialog: true })}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{session.recipe.title}</h4>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Started {formatDistanceToNow(new Date(session.startedAt))} ago</span>
                  </div>
                  {session.currentStep !== undefined && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Step {session.currentStep + 1} of {JSON.parse(session.recipe.instructions).length}
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
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
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sortedAndFilteredRecipes?.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No recipes found matching "{searchQuery}"
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedAndFilteredRecipes?.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={() => setSelectedRecipe(recipe.id)}
              onDelete={() => handleDelete(recipe)}
              onCook={() => setCookingViewRecipe({ recipe })}
            />
          ))}
        </div>
      )}

      <Dialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{recipeToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setRecipeToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete Recipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
  const cookCount = history?.length || 0

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <div className="relative aspect-video w-full bg-muted">
        {recipe.imageUrl ? (
          <>
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', recipe.imageUrl)
                (e.target as HTMLImageElement).src = '/placeholder-recipe.jpg'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium flex items-center gap-1">
              <ChefHat className="h-4 w-4" />
              <span>{cookCount}x</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImagePlus className="h-12 w-12" />
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
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
            <Button variant="destructive" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>Prep: {recipe.prepTime}min • Cook: {recipe.cookTime}min</p>
          <p>Difficulty: {recipe.difficulty}</p>
          {lastCooked?.completedAt && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <History className="h-3 w-3" />
              <span>Last cooked: {formatDistanceToNow(new Date(lastCooked.completedAt))} ago</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}