-- AlterTable
ALTER TABLE `Order`
    ADD COLUMN `fbp` VARCHAR(100) NULL,
    ADD COLUMN `fbc` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `ConversionApiLog` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `eventName` VARCHAR(64) NOT NULL,
    `eventKey` VARCHAR(64) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `error` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ConversionApiLog_status_idx`(`status`),
    INDEX `ConversionApiLog_provider_eventKey_idx`(`provider`, `eventKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConversionApiLog` ADD CONSTRAINT `ConversionApiLog_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
