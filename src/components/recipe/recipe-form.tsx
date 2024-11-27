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
import { Plus, Minus, ImagePlus, X, Loader2, Wand2 } from "lucide-react"
import { DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { type Ingredient } from "@/types/recipe"
import { type RecipeSuggestion } from "@/utils/claude"

type Difficulty = "Easy" | "Medium" | "Hard"

interface RecipeFormProps {
  recipeId?: string
  onError?: (error: string | null) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function RecipeForm({ recipeId, onError }: RecipeFormProps) {
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
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false)

  const utils = trpc.useContext()
  
  const { data: existingRecipe } = trpc.recipe.getById.useQuery(recipeId ?? "", {
    enabled: !!recipeId,
  })

  const uploadImage = trpc.recipe.uploadImage.useMutation({
    onSuccess: (url) => {
      console.log('Image upload success:', url)
      setImageUrl(url)
      setIsUploading(false)
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })
    },
    onError: (error) => {
      console.error('Image upload error:', error)
      setImageError("Failed to upload image")
      setIsUploading(false)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload image",
      })
    },
  })

  const deleteImage = trpc.recipe.deleteImage.useMutation()

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

  const getSuggestions = trpc.recipe.getSuggestions.useMutation({
    onSuccess: (suggestions) => {
      // Only update if fields are empty or user confirms
      const hasExistingData = ingredients.some(i => i.name) || 
        instructions.some(i => i) ||
        prepTime > 0 ||
        cookTime > 0;

      if (hasExistingData) {
        const confirmed = window.confirm(
          "This will replace your existing recipe details. Do you want to continue?"
        );
        if (!confirmed) return;
      }

      // Apply suggestions
      setIngredients(suggestions.ingredients);
      setInstructions(suggestions.instructions);
      setPrepTime(suggestions.prepTime);
      setCookTime(suggestions.cookTime);
      setDifficulty(suggestions.difficulty);
      setCuisineType(suggestions.cuisineType);
      setTags(suggestions.tags);

      toast({
        title: "Success",
        description: "Recipe suggestions applied!",
      });
    },
    onError: (error) => {
      console.error('Error getting suggestions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get recipe suggestions. Please try again or enter details manually.",
      });
    },
    onSettled: () => {
      setIsGettingSuggestions(false);
    },
  });

  const handleGetSuggestions = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a recipe title first",
      });
      return;
    }

    try {
      setIsGettingSuggestions(true);
      await getSuggestions.mutateAsync({ title });
    } catch (error) {
      console.error('Error in handleGetSuggestions:', error);
      // Error will be handled by onError callback
    }
  };

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

  const validateImage = (file: File): string | null => {
    console.log('Validating image:', file.name, file.size, file.type)
    if (file.size > MAX_FILE_SIZE) {
      return "Image size must be less than 5MB"
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Only JPEG, PNG and WebP images are allowed"
    }
    return null
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag enter');
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag leave');
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag over');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('File dropped');
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log('Processing dropped file:', file.name);
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    console.log('Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setImageError(null);
    const error = validateImage(file);
    if (error) {
      console.error('Image validation error:', error);
      setImageError(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
      return;
    }

    try {
      setIsUploading(true);
      setImageFile(file);

      const reader = new FileReader();
      reader.onloadstart = () => console.log('Started reading file');
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          console.log(`Reading progress: ${progress.toFixed(2)}%`);
        }
      };

      reader.onloadend = async () => {
        console.log('File read complete');
        try {
          const base64String = reader.result as string;
          console.log('Starting upload to server...');
          const imageUrl = await uploadImage.mutateAsync({
            image: base64String,
            contentType: file.type,
          });
          console.log('Upload successful, image URL:', imageUrl);
          setImageUrl(imageUrl);
          setIsUploading(false);
          toast({
            title: "Success",
            description: "Image uploaded successfully",
          });
        } catch (error) {
          console.error('Upload error:', error);
          setImageError("Failed to upload image");
          setIsUploading(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to upload image to server",
          });
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setImageError("Failed to read image file");
        setIsUploading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to read image file",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setImageError("Failed to process image");
      setIsUploading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process image",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Image upload triggered');
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemoveImage = async () => {
    if (imageUrl) {
      try {
        console.log('Removing image:', imageUrl);
        setIsUploading(true);

        // Delete the file from the server
        await deleteImage.mutateAsync(imageUrl);

        // If this is an edit form, update the recipe in the database
        if (existingRecipe?.id) {
          const recipeData = {
            title: existingRecipe.title,
            ingredients: JSON.parse(existingRecipe.ingredients as string),
            instructions: JSON.parse(existingRecipe.instructions as string),
            prepTime: existingRecipe.prepTime,
            cookTime: existingRecipe.cookTime,
            servings: existingRecipe.servings,
            difficulty: existingRecipe.difficulty as "Easy" | "Medium" | "Hard",
            cuisineType: existingRecipe.cuisineType || undefined,
            tags: existingRecipe.tags,
            imageUrl: '',
            nutrition: existingRecipe.nutrition || undefined,
          };

          await updateRecipe.mutateAsync({
            id: existingRecipe.id,
            data: recipeData
          });
        }

        setImageUrl('');
        setImageFile(null);
        toast({
          title: "Success",
          description: "Image removed successfully",
        });
      } catch (error) {
        console.error('Error removing image:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to remove image",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

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
    setImageUrl("")
    setImageFile(null)
    setImageError(null)
  }

  const validateForm = () => {
    if (!title.trim()) {
      setError("Please enter a recipe title")
      return false
    }

    if (ingredients.some(ing => !ing.name.trim() || !ing.unit.trim())) {
      setError("Please fill in all ingredient fields")
      return false
    }

    if (ingredients.some(ing => ing.amount <= 0)) {
      setError("Ingredient amounts must be greater than 0")
      return false
    }

    if (instructions.some(inst => !inst.trim())) {
      setError("Please fill in all instruction steps")
      return false
    }

    if (prepTime < 0 || cookTime < 0) {
      setError("Prep and cook times cannot be negative")
      return false
    }

    if (servings <= 0) {
      setError("Number of servings must be greater than 0")
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
      setError("Failed to save recipe. Please try again.")
    }
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
        <div 
          className={`relative group mb-6 ${isDragging ? 'border-2 border-primary border-dashed' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
            {imageUrl && imageUrl !== '' ? (
              <div className="relative w-full h-full group">
                <img
                  src={imageUrl}
                  alt="Recipe preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', imageUrl);
                    // If image fails to load, clear the URL
                    setImageUrl('');
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <ImagePlus className="h-12 w-12 mb-2" />
                <p className="text-sm text-center">
                  {isDragging ? 'Drop image here' : 'Drag and drop an image here, or click to select'}
                </p>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <label className="cursor-pointer z-10">
                <input
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  onClick={(e) => {
                    console.log('File input clicked');
                    (e.target as HTMLInputElement).value = '';
                  }}
                />
                {!imageUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white hover:bg-gray-100"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Uploading...
                      </div>
                    ) : "Select Image"}
                  </Button>
                )}
              </label>
            </div>
          </div>
          {imageError && (
            <p className="text-sm text-destructive mt-2">{imageError}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {isUploading ? "Uploading..." : "Supported formats: JPEG, PNG, WebP (max 5MB)"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-lg font-semibold mb-2 block">Recipe Title</label>
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter recipe title"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGetSuggestions}
                disabled={isGettingSuggestions || !title.trim()}
              >
                {isGettingSuggestions ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting Suggestions...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Get Suggestions
                  </>
                )}
              </Button>
            </div>
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
            <Button type="submit" disabled={createRecipe.isLoading || updateRecipe.isLoading || isUploading}>
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