-- AlterTable
ALTER TABLE "CookingHistory" ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "instructions" TEXT,
ALTER COLUMN "completedAt" DROP NOT NULL,
ALTER COLUMN "actualTime" DROP NOT NULL,
ALTER COLUMN "servingsCooked" DROP NOT NULL;
