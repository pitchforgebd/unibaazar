-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `href` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `Notification_channel_createdAt_idx` ON `Notification`(`channel`, `createdAt`);
