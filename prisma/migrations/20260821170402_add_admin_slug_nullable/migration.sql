-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_slug_key" ON "Admin"("slug");
