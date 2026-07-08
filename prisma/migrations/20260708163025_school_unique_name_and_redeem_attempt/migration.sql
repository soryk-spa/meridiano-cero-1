-- CreateTable
CREATE TABLE "RedeemAttempt" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RedeemAttempt_clerkUserId_createdAt_idx" ON "RedeemAttempt"("clerkUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

