-- AlterTable: add sequential display number to tickets
ALTER TABLE "tickets" ADD COLUMN "nro" SERIAL NOT NULL;
