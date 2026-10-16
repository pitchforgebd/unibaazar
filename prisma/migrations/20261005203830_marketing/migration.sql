-- AlterTable
ALTER TABLE `coupon` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `perUserLimit` INTEGER NULL,
    ADD COLUMN `productId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('PERCENT', 'FIXED', 'FREE_SHIPPING') NOT NULL;

-- AlterTable
ALTER TABLE `flashsaleitem` ADD COLUMN `qtyLimit` INTEGER NULL;

-- CreateTable
CREATE TABLE `Subscriber` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Subscriber_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` ENUM('SMS', 'EMAIL') NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SENT') NOT NULL DEFAULT 'DRAFT',
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductRelation` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `relatedId` VARCHAR(191) NOT NULL,
    `kind` ENUM('UPSELL', 'CROSS_SELL', 'BUNDLE', 'RELATED') NOT NULL,

    INDEX `ProductRelation_relatedId_idx`(`relatedId`),
    UNIQUE INDEX `ProductRelation_productId_relatedId_kind_key`(`productId`, `relatedId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Coupon_categoryId_idx` ON `Coupon`(`categoryId`);

-- CreateIndex
CREATE INDEX `Coupon_productId_idx` ON `Coupon`(`productId`);

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductRelation` ADD CONSTRAINT `ProductRelation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductRelation` ADD CONSTRAINT `ProductRelation_relatedId_fkey` FOREIGN KEY (`relatedId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
