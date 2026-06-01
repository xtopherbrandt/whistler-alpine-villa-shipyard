-- CreateEnum
CREATE TYPE "StayType" AS ENUM ('OWN', 'GUEST');

-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "stayType" "StayType" NOT NULL,
    "status" "StayStatus" NOT NULL DEFAULT 'CONFIRMED',
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "guestName" TEXT,
    "guestContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (partial index for confirmed stay overlap queries)
CREATE INDEX "Stay_confirmed_overlap_idx"
  ON "Stay" ("unitId", "checkInDate", "checkOutDate")
  WHERE status = 'CONFIRMED';
