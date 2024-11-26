import { useState } from "react"
import { trpc } from "@/utils/trpc"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RecipeForm } from "./recipe-form"
import { CookingView } from "./cooking-view"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, ChefHat, History } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function RecipeList() {
  const { data: recipes, isLoading } = trpc.recipe.getAll.useQuery()
  const { toast } = useToast()
  const utils = trpc.useContext()
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [cookingViewRecipe, setCookingViewRecipe] = useState<string | null>(null)

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

  if (isLoading) {
    return <div>Loading recipes...</div>
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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Recipes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onEdit={() => setSelectedRecipe(recipe.id)}
            onDelete={() => handleDelete(recipe.id)}
            onCook={() => setCookingViewRecipe(recipe.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface RecipeCardProps {
  recipe: any
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