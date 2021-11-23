-- CreateTable
CREATE TABLE "ActiveGuild" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "role" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EnteringRoom" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DictionaryIndex" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ReadUpQueue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveGuild_guildId_key" ON "ActiveGuild"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EnteringRoom_guildId_key" ON "EnteringRoom"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EnteringRoom_channelId_key" ON "EnteringRoom"("channelId");
