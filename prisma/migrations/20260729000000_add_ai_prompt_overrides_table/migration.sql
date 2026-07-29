-- CreateTable
CREATE TABLE "ai_prompt_overrides" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompt_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_overrides_userId_promptKey_key" ON "ai_prompt_overrides"("userId", "promptKey");

-- AddForeignKey
ALTER TABLE "ai_prompt_overrides" ADD CONSTRAINT "ai_prompt_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
