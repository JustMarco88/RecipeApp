import { type NextPage } from "next"
import Head from "next/head"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RecipeForm } from "@/components/recipe/recipe-form"
import { RecipeList } from "@/components/recipe/recipe-list"
import { Plus } from "lucide-react"

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Recipe App</title>
        <meta name="description" content="Modern recipe management application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Recipe App</h1>
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
              </DialogHeader>
              <RecipeForm />
            </DialogContent>
          </Dialog>
        </div>

        <RecipeList />
      </main>
    </>
  )
}

export default Home 