-- CreateTable
CREATE TABLE "Row" (
    "versionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Row_pkey" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "Table" (
    "versionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "_RowToTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RowToTable_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RowToTable_B_index" ON "_RowToTable"("B");

-- AddForeignKey
ALTER TABLE "_RowToTable" ADD CONSTRAINT "_RowToTable_A_fkey" FOREIGN KEY ("A") REFERENCES "Row"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RowToTable" ADD CONSTRAINT "_RowToTable_B_fkey" FOREIGN KEY ("B") REFERENCES "Table"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;
