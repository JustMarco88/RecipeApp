import { useState, useMemo } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Clock,
  ChefHat,
  Trash2,
  Plus,
  Search,
  X,
  ChevronRight,
  TimerIcon,
  ImagePlus,
  Pencil,
} from 'lucide-react'
import { type Recipe, type CookingHistory, type RecipeWithHistory } from '@/types/recipe'
import { api } from '@/utils/api'
import { useCookingStore } from '@/store/cookingStore'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { CookingView } from './cooking-view'
import { RecipeWizard } from './recipe-wizard'
import { RecipeForm } from './recipe-form'

type SortOption = {
  label: string
  sortFn: (a: Recipe, b: Recipe) => number
}

const sortOptions: SortOption[] = [
  {
    label: 'Recently Added',
    sortFn: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  },
  {
    label: 'Recently Cooked',
    sortFn: (a, b) => {
      const aLastCooked = a.cookingHistory?.[0]?.completedAt
      const bLastCooked = b.cookingHistory?.[0]?.completedAt
      if (!aLastCooked && !bLastCooked) return 0
      if (!aLastCooked) return 1
      if (!bLastCooked) return -1
      return bLastCooked.getTime() - aLastCooked.getTime()
    },
  },
  {
    label: 'Least Recently Cooked',
    sortFn: (a, b) => {
      const aLastCooked = a.cookingHistory?.[0]?.completedAt
      const bLastCooked = b.cookingHistory?.[0]?.completedAt
      if (!aLastCooked && !bLastCooked) return 0
      if (!aLastCooked) return -1
      if (!bLastCooked) return 1
      return aLastCooked.getTime() - bLastCooked.getTime()
    },
  },
]

interface RecipeCardProps {
  recipe: Recipe
  onEdit: (recipe: Recipe) => void
  onDelete: (recipe: Recipe) => void
  onCook: (recipe: Recipe) => void
  onSearch: (query: string) => void
}

function RecipeCard({ recipe, onEdit, onDelete, onCook, onSearch }: RecipeCardProps) {
  const { data: history } = api.recipe.getCookingHistory.useQuery(recipe.id)
  const lastCooked = history?.find((h: CookingHistory) => h.completedAt !== null)
  const cookCount = history?.filter((h: CookingHistory) => h.completedAt !== null).length || 0
  const { toast } = useToast()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { sessions, endSession } = useCookingStore()
  const activeSession = sessions[recipe.id]

  const handleCloseSession = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCloseConfirm(true)
  }

  const confirmCloseSession = () => {
    endSession(recipe.id)
    setShowCloseConfirm(false)
    toast({
      title: 'Session closed',
      description: 'Your cooking session has been closed.',
    })
  }

  return (
    <>
      <div className="border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="relative aspect-video w-full bg-muted">
          {recipe.imageUrl ? (
            <>
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
                onError={e => {
                  console.error('Image failed to load:', recipe.imageUrl)
                  ;(e.target as HTMLImageElement).src = '/placeholder-recipe.jpg'
                }}
              />
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium flex items-center gap-1">
                <ChefHat className="h-4 w-4" />
                <span>{cookCount}x</span>
              </div>
              {recipe.tags.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-[2px]">
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.tags.map((tag: string, index: number) => (
                      <button
                        key={index}
                        onClick={e => {
                          e.stopPropagation()
                          onSearch(tag)
                        }}
                        className="px-2 py-0.5 text-xs rounded-full bg-accent/10 hover:bg-accent/20 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              {activeSession?.status === 'paused' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-orange-500 hover:text-orange-600"
                  onClick={handleCloseSession}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
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
                    <DialogDescription>Modify your recipe details</DialogDescription>
                  </DialogHeader>
                  <RecipeForm recipeId={recipe.id} />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Prep: {recipe.prepTime}min • Cook: {recipe.cookTime}min
            </p>
            <p>Difficulty: {recipe.difficulty}</p>
            {activeSession?.status === 'paused' && (
              <p className="text-orange-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Active session
              </p>
            )}
            {lastCooked?.completedAt && (
              <p className="text-xs mt-2">
                Last cooked: {formatDistanceToNow(new Date(lastCooked.completedAt))} ago
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close cooking session?</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this cooking session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmCloseSession}>
              Close Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function RecipeList() {
  const { data: recipes, isLoading } = api.recipe.getAll.useQuery(undefined, {
    refetchOnWindowFocus: true,
  })
  const { sessions, endSession } = useCookingStore()
  const { toast } = useToast()
  const utils = api.useContext()
  const [cookingViewRecipe, setCookingViewRecipe] = useState<{
    recipe: Recipe
    skipResumeDialog?: boolean
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [sortBy, setSortBy] = useState<string>(sortOptions[0].label)
  const [sessionToClose, setSessionToClose] = useState<{
    recipeId: string
    recipeName: string
  } | null>(null)
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)

  // Get active and saved sessions
  const activeSessions = useMemo(() => {
    if (!recipes) return []

    return Object.values(sessions)
      .filter(
        (session): session is CookingSession =>
          session !== null && (session.status === 'active' || session.status === 'paused')
      )
      .map(session => {
        const recipe = recipes.find((r: Recipe) => r.id === session.recipeId)
        if (!recipe) return null
        return { session, recipe }
      })
      .filter((item): item is { session: CookingSession; recipe: Recipe } => item !== null)
      .sort(
        (a, b) =>
          new Date(b.session.lastActiveAt).getTime() - new Date(a.session.lastActiveAt).getTime()
      )
  }, [sessions, recipes])

  const handleCloseSession = (recipeId: string, recipeName: string) => {
    setSessionToClose({ recipeId, recipeName })
  }

  const confirmCloseSession = () => {
    if (!sessionToClose) return

    endSession(sessionToClose.recipeId)
    toast({
      title: 'Session closed',
      description: 'Your cooking session has been closed.',
    })
    setSessionToClose(null)
  }

  const deleteRecipe = api.recipe.delete.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: 'Success',
        description: 'Recipe deleted successfully',
      })
      setRecipeToDelete(null)
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete recipe',
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
        ingredients.some((ing: { name: string }) => ing.name.toLowerCase().includes(term))
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
        instructions.some((instruction: string) => instruction.toLowerCase().includes(term))
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
        (recipe.cuisineType &&
          searchTerms.every(term => recipe.cuisineType?.toLowerCase().includes(term))) ||
        searchTerms.every(term =>
          recipe.tags.some((tag: string) => tag.toLowerCase().includes(term))
        )
      )
    })
    .sort(sortOptions.find(option => option.label === sortBy)?.sortFn)

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
          void utils.recipe.getAll.invalidate()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Recipes</h2>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Recipe
          </Button>
        </div>

        {/* Show wizard instead of dialog */}
        {showWizard && <RecipeWizard onClose={() => setShowWizard(false)} />}

        {/* Active Cooking Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Active Cooking Sessions
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map(({ session, recipe }) => (
                <div
                  key={session.recipeId}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group cursor-pointer"
                  onClick={() => setCookingViewRecipe({ recipe, skipResumeDialog: true })}
                >
                  <div className="relative h-16 w-16 flex-shrink-0">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="h-full w-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted rounded-md flex items-center justify-center">
                        <ChefHat className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background',
                        session.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{recipe.title}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {session.status === 'active' ? 'Started' : 'Last active'}{' '}
                          {formatDistanceToNow(new Date(session.lastActiveAt))} ago
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3" />
                        <span>
                          Step {session.currentStep + 1} of {JSON.parse(recipe.instructions).length}
                        </span>
                      </div>
                      {session.timers.some(t => t.isActive) && (
                        <div className="flex items-center gap-2 text-orange-500">
                          <TimerIcon className="h-3 w-3" />
                          <span>
                            {session.timers.filter(t => t.isActive).length} active timer(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 hover:text-orange-600"
                      onClick={e => {
                        e.stopPropagation()
                        handleCloseSession(recipe.id, recipe.title)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Session Confirmation Dialog */}
        <Dialog open={!!sessionToClose} onOpenChange={open => !open && setSessionToClose(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close cooking session?</DialogTitle>
              <DialogDescription>
                Are you sure you want to close the cooking session for "{sessionToClose?.recipeName}
                "? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSessionToClose(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmCloseSession}>
                Close Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search and Sort */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.label} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sortedAndFilteredRecipes?.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No recipes found matching "{searchQuery}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndFilteredRecipes?.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={() => setSelectedRecipe(recipe.id)}
              onDelete={() => handleDelete(recipe)}
              onCook={() => setCookingViewRecipe({ recipe, skipResumeDialog: false })}
              onSearch={setSearchQuery}
            />
          ))}
        </div>
      )}

      <Dialog open={!!recipeToDelete} onOpenChange={open => !open && setRecipeToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{recipeToDelete?.title}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setRecipeToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Recipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
