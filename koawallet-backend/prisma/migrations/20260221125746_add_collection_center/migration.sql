-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "buyPrice" DOUBLE PRECISION NOT NULL DEFAULT 3.50,
    "sellPrice" DOUBLE PRECISION NOT NULL DEFAULT 4.00,
    "maintenanceFee" DOUBLE PRECISION NOT NULL DEFAULT 1.00,
    "networkFee" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "marketTonPrice" DOUBLE PRECISION,
    "lastMarketPrice" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalReserve" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totalCacaoStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokensIssued" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalReserve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionCenter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "managerName" TEXT,
    "operatingHours" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapsUrl" TEXT,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionCenter_pkey" PRIMARY KEY ("id")
);
