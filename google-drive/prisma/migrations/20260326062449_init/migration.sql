-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "storageUsed" BIGINT NOT NULL DEFAULT 0,
    "storageLimit" BIGINT NOT NULL DEFAULT 1073741824,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" BIGINT NOT NULL DEFAULT 0,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "s3Key" TEXT,
    "uploadStatus" TEXT NOT NULL DEFAULT 'pending',
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "trashedAt" TIMESTAMP(3),
    "trashedByAncestorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "File_userId_parentId_idx" ON "File"("userId", "parentId");

-- CreateIndex
CREATE INDEX "File_userId_starred_idx" ON "File"("userId", "starred");

-- CreateIndex
CREATE INDEX "File_userId_name_idx" ON "File"("userId", "name");

-- CreateIndex
CREATE INDEX "File_userId_trashedAt_idx" ON "File"("userId", "trashedAt");

-- CreateIndex
CREATE INDEX "File_userId_trashedByAncestorId_idx" ON "File"("userId", "trashedByAncestorId");

-- CreateIndex
CREATE INDEX "File_userId_uploadStatus_idx" ON "File"("userId", "uploadStatus");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
