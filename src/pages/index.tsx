import { trpc } from '../utils/trpc';

export default function Home() {
  const { data: recipes, isLoading } = trpc.recipe.getAll.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Recipe App</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes?.map((recipe) => (
          <div
            key={recipe.id}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{recipe.title}</h2>
            <div className="text-gray-600">
              <p>Prep time: {recipe.prepTime} mins</p>
              <p>Cook time: {recipe.cookTime} mins</p>
              <p>Difficulty: {recipe.difficulty}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 