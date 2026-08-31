-- CreateTable
CREATE TABLE "user_hidden_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_hidden_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_hidden_categories_userId_categoryId_key" ON "user_hidden_categories"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "user_hidden_categories" ADD CONSTRAINT "user_hidden_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hidden_categories" ADD CONSTRAINT "user_hidden_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
