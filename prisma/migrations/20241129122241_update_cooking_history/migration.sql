/*
  Warnings:

  - You are about to drop the column `status` on the `CookingHistory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CookingHistory_recipeId_status_idx";

-- AlterTable
ALTER TABLE "CookingHistory" DROP COLUMN "status";

-- CreateIndex
CREATE INDEX "CookingHistory_recipeId_idx" ON "CookingHistory"("recipeId");
