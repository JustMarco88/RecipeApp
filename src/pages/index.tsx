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
        <RecipeList />
      </main>
    </>
  )
}

export default Home 