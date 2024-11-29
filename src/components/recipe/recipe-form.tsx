import { useEffect, useState, useRef } from "react"
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
import { api } from "@/utils/api"
import { Plus, Minus, ImagePlus, X, Loader2, Wand2 } from "lucide-react"
import { DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { type Ingredient } from "@/types/recipe"
import { type RecipeSuggestion, type RecipeImprovement } from "@/types/recipe"
import { SuggestionReviewDialog } from "./suggestion-review-dialog"
import { type TRPCClientErrorLike } from "@trpc/client"
import { type AppRouter } from "@/server/api/root"

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
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false)
  const [currentSuggestions, setCurrentSuggestions] = useState<RecipeSuggestion | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const dialogRef = useRef<HTMLButtonElement>(null)

  const utils = api.useContext()
  
  const { data: existingRecipe } = api.recipe.getById.useQuery(recipeId ?? "", {
    enabled: !!recipeId,
  })

  const uploadImage = api.recipe.uploadImage.useMutation({
    onSuccess: (url: string) => {
      console.log('Image upload success:', url)
      setImageUrl(url)
      setIsUploading(false)
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Image upload error:', error)
      setImageError("Failed to upload image")
      setIsUploading(false)
    }
  });

  const deleteImage = api.recipe.deleteImage.useMutation()

  const createRecipe = api.recipe.create.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Recipe created successfully",
      })
      dialogRef.current?.click()
    },
  })

  const updateRecipe = api.recipe.update.useMutation({
    onSuccess: () => {
      utils.recipe.getAll.invalidate()
      toast({
        title: "Success",
        description: "Recipe updated successfully",
      })
      dialogRef.current?.click()
    },
  })

  const getSuggestions = api.recipe.getSuggestions.useMutation({
    onSuccess: (suggestions: RecipeSuggestion | RecipeImprovement) => {
      if ('ingredients' in suggestions) {
        setCurrentSuggestions(suggestions)
        setShowSuggestionDialog(true)
      }
      setIsGettingSuggestions(false)
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Error getting suggestions:', error)
      toast({
        title: "Error",
        description: "Failed to get recipe suggestions",
        variant: "destructive",
      })
      setIsGettingSuggestions(false)
    }
  });

  const handleGetSuggestions = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a recipe title first",
      })
      return
    }

    setIsGettingSuggestions(true)
    await getSuggestions.mutateAsync({ title })
  }

  const handleApplySuggestions = async (changes: Partial<RecipeSuggestion>) => {
    try {
      // First apply all the changes
      if (changes.ingredients) setIngredients(changes.ingredients)
      if (changes.instructions) setInstructions(changes.instructions)
      if (changes.prepTime) setPrepTime(changes.prepTime)
      if (changes.cookTime) setCookTime(changes.cookTime)
      if (changes.difficulty) setDifficulty(changes.difficulty)
      if (changes.cuisineType) setCuisineType(changes.cuisineType)
      if (changes.tags) setTags(changes.tags)

      // If we don't have an image yet and we have ingredients, generate one
      if (!imageUrl && changes.ingredients && changes.ingredients.length > 0) {
        console.log('Starting image generation for recipe:', title);

        setIsGeneratingImage(true);
        
        const result = await generateImage.mutateAsync({
          title,
          ingredients: changes.ingredients,
          cuisineType: changes.cuisineType,
        });

        if (result.imageUrl) {
          setImageUrl(result.imageUrl);
          toast({
            title: "Success",
            description: "Generated a recipe image using AI!",
          });
        }
      }

      toast({
        title: "Success",
        description: "Changes applied successfully!",
      });
    } catch (error) {
      console.error('Error applying suggestions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply changes",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateImage = api.recipe.generateImage.useMutation({
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateImage = async () => {
    if (!title || !ingredients.length) {
      toast({
        title: "Error",
        description: "Please add a title and at least one ingredient first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const result = await generateImage.mutateAsync({
        title,
        ingredients,
        cuisineType,
      });

      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        toast({
          title: "Success",
          description: "Generated a recipe image using AI!",
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
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
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipe Image</label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted'
              } ${imageUrl ? 'h-48' : 'h-32'} transition-all`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {imageUrl ? (
                <div className="relative h-full">
                  <img
                    src={imageUrl}
                    alt="Recipe"
                    className="h-full mx-auto object-contain"
                  />
                  <div className="absolute top-0 right-0 flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateImage}
                      disabled={isUploading}
                      title="Generate new image"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    {title && ingredients.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleGenerateImage}
                        disabled={isUploading}
                        title="Generate image with AI"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <label
                      htmlFor="image-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary/80"
                    >
                      Upload an image
                      <input
                        id="image-upload"
                        name="image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                    {" or drag and drop"}
                    <p className="text-xs">PNG, JPG or WebP up to 5MB</p>
                  </div>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
            {imageError && (
              <p className="text-sm text-destructive">{imageError}</p>
            )}
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
                  size="icon"
                  className="ml-2"
                  onClick={handleGetSuggestions}
                  disabled={isGettingSuggestions}
                >
                  {isGettingSuggestions ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
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

            <div className="mb-4">
              <label className="text-lg font-semibold mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center bg-secondary px-2 py-1 rounded">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((_, i) => i !== index))}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tags (e.g., vegetarian, gluten-free)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      e.preventDefault();
                      const newTag = e.currentTarget.value.trim();
                      if (newTag && !tags.includes(newTag)) {
                        setTags([...tags, newTag]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-lg font-semibold mb-2 block">Cuisine Type</label>
              <Input
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                placeholder="e.g., Italian, Mexican, etc."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="submit" 
                disabled={createRecipe.isLoading || updateRecipe.isLoading || isUploading || isGeneratingImage}
              >
                {recipeId ? (
                  updateRecipe.isLoading ? "Updating..." : "Update Recipe"
                ) : (
                  createRecipe.isLoading ? "Creating..." : "Create Recipe"
                )}
              </Button>
              <DialogClose ref={dialogRef} className="hidden" />
            </div>
          </div>
        </div>
      </form>

      {currentSuggestions && (
        <SuggestionReviewDialog
          isOpen={showSuggestionDialog}
          onClose={() => setShowSuggestionDialog(false)}
          currentRecipe={{
            ingredients,
            instructions,
            prepTime,
            cookTime,
            difficulty,
            cuisineType,
            tags,
          }}
          suggestions={currentSuggestions}
          onApplyChanges={handleApplySuggestions}
        />
      )}
    </>
  )
} 