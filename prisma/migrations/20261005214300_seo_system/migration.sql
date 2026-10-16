-- AlterTable
ALTER TABLE `SeoMeta` ADD COLUMN `focusKeyword` VARCHAR(80) NULL;

-- CreateTable
CREATE TABLE `NotFoundHit` (
    `path` VARCHAR(500) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `lastSeen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
