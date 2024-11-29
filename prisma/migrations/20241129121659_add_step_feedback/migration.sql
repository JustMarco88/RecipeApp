/*
  Warnings:

  - You are about to drop the column `ingredients` on the `CookingHistory` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `CookingHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CookingHistory" DROP COLUMN "ingredients",
DROP COLUMN "instructions",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "stepFeedback" TEXT;

-- CreateIndex
CREATE INDEX "CookingHistory_recipeId_status_idx" ON "CookingHistory"("recipeId", "status");

-- CreateIndex
CREATE INDEX "CookingHistory_startedAt_idx" ON "CookingHistory"("startedAt");
