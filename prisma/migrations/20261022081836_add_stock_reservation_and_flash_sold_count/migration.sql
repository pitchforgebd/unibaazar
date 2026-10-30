-- AlterTable
-- The table was created as `FlashSaleItem` (20261005180544_init) and later
-- referenced correctly in that same case (20261005203830_marketing). This
-- line originally said `flashsaleitem` — MySQL on Windows is
-- case-insensitive for table names (lower_case_table_names=1, the default),
-- so it applied there silently; MySQL on Linux defaults to case-sensitive
-- (lower_case_table_names=0), so this failed every CI run and every real
-- deploy would have hit it too, with "Table 'flashsaleitem' doesn't exist".
ALTER TABLE `FlashSaleItem` ADD COLUMN `soldCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `StockReservation` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockReservation_variantId_status_expiresAt_idx`(`variantId`, `status`, `expiresAt`),
    INDEX `StockReservation_token_idx`(`token`),
    UNIQUE INDEX `StockReservation_token_variantId_key`(`token`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
