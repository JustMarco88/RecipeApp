import { trpc } from '../utils/trpc';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RecipeForm } from '@/components/recipe/recipe-form';

export default function Home() {
  const { data: recipes, isLoading } = trpc.recipe.getAll.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Recipe App</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
            </DialogHeader>
            <RecipeForm />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes?.map((recipe) => (
          <div
            key={recipe.id}
            className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow bg-card text-card-foreground"
          >
            <h2 className="text-xl font-semibold mb-3">{recipe.title}</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>Prep time: {recipe.prepTime} mins</p>
              <p>Cook time: {recipe.cookTime} mins</p>
              <p>Difficulty: {recipe.difficulty}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 