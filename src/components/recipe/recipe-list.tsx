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
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

export function RecipeList() {
  const { data: recipes, isLoading } = trpc.recipe.getAll.useQuery()
  const { toast } = useToast()
  const utils = trpc.useContext()
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Recipes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((recipe) => (
          <div
            key={recipe.id}
            className="p-4 border rounded-lg shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{recipe.title}</h3>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedRecipe(recipe.id)}
                    >
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
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(recipe.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Prep: {recipe.prepTime}min • Cook: {recipe.cookTime}min</p>
              <p>Difficulty: {recipe.difficulty}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 