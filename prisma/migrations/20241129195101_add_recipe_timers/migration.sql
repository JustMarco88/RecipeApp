-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "timers" TEXT;

-- CreateTable
CREATE TABLE "TimerTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimerTemplate_pkey" PRIMARY KEY ("id")
);
