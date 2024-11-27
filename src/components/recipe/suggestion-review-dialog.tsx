import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { type RecipeIngredient } from "@/types/recipe"
import { type RecipeSuggestion } from "@/utils/claude"

interface SuggestionReviewDialogProps {
  isOpen: boolean
  onClose: () => void
  currentRecipe: {
    ingredients: RecipeIngredient[]
    instructions: string[]
    prepTime: number
    cookTime: number
    difficulty: 'Easy' | 'Medium' | 'Hard'
    cuisineType: string
    tags: string[]
  }
  suggestions: RecipeSuggestion
  onApplyChanges: (changes: {
    ingredients?: RecipeIngredient[]
    instructions?: string[]
    prepTime?: number
    cookTime?: number
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    cuisineType?: string
    tags?: string[]
  }) => void
}

export function SuggestionReviewDialog({
  isOpen,
  onClose,
  currentRecipe,
  suggestions,
  onApplyChanges,
}: SuggestionReviewDialogProps) {
  const handleApplyAll = () => {
    onApplyChanges(suggestions)
    onClose()
  }

  const handleApplySection = (section: keyof RecipeSuggestion) => {
    onApplyChanges({ [section]: suggestions[section] })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review AI Suggestions</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-6 p-4">
              {/* Ingredients Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Ingredients</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySection('ingredients')}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Apply Changes
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current</h4>
                    <ul className="space-y-1">
                      {currentRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm">
                          {ing.amount} {ing.unit} {ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Suggested</h4>
                    <ul className="space-y-1">
                      {suggestions.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm">
                          {ing.amount} {ing.unit} {ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Instructions</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySection('instructions')}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Apply Changes
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {currentRecipe.instructions.map((inst, i) => (
                        <li key={i} className="text-sm">{inst}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Suggested</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {suggestions.instructions.map((inst, i) => (
                        <li key={i} className="text-sm">{inst}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* Times Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Times</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyChanges({
                      prepTime: suggestions.prepTime,
                      cookTime: suggestions.cookTime,
                    })}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Apply Changes
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current</h4>
                    <p className="text-sm">Prep Time: {currentRecipe.prepTime} minutes</p>
                    <p className="text-sm">Cook Time: {currentRecipe.cookTime} minutes</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Suggested</h4>
                    <p className="text-sm">Prep Time: {suggestions.prepTime} minutes</p>
                    <p className="text-sm">Cook Time: {suggestions.cookTime} minutes</p>
                  </div>
                </div>
              </div>

              {/* Other Details Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Other Details</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyChanges({
                      difficulty: suggestions.difficulty,
                      cuisineType: suggestions.cuisineType,
                      tags: suggestions.tags,
                    })}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Apply Changes
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current</h4>
                    <p className="text-sm">Difficulty: {currentRecipe.difficulty}</p>
                    <p className="text-sm">Cuisine: {currentRecipe.cuisineType}</p>
                    <p className="text-sm">Tags: {currentRecipe.tags.join(', ')}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Suggested</h4>
                    <p className="text-sm">Difficulty: {suggestions.difficulty}</p>
                    <p className="text-sm">Cuisine: {suggestions.cuisineType}</p>
                    <p className="text-sm">Tags: {suggestions.tags.join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleApplyAll}>
            <Check className="w-4 h-4 mr-1" />
            Apply All Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 