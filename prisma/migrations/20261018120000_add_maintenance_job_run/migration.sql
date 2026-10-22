-- CreateTable
CREATE TABLE `MaintenanceJobRun` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(64) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `resultSummary` JSON NULL,
    `triggeredByUserId` VARCHAR(191) NULL,

    INDEX `MaintenanceJobRun_jobId_startedAt_idx`(`jobId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MaintenanceJobRun` ADD CONSTRAINT `MaintenanceJobRun_triggeredByUserId_fkey` FOREIGN KEY (`triggeredByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
