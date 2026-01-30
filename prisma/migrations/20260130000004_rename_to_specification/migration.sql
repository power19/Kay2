-- Rename LiterVariation table to Specification
ALTER TABLE "LiterVariation" RENAME TO "Specification";

-- Rename columns in Specification table
ALTER TABLE "Specification" RENAME COLUMN "sizeInLiters" TO "value";
ALTER TABLE "Specification" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Drop isDrum column (no longer needed for electronics)
ALTER TABLE "Specification" DROP COLUMN "isDrum";

-- Convert value to string
-- SQLite doesn't support direct column type changes, but since we're renaming sizeInLiters to value,
-- and the new schema expects String, we need to handle this carefully.
-- For SQLite, we'll need to recreate the table structure.

-- Actually in SQLite, ALTER TABLE has limited support.
-- We'll handle this by using db push instead which handles schema migrations automatically.

-- Rename the foreign key column in ProductVariant
ALTER TABLE "ProductVariant" RENAME COLUMN "literVariationId" TO "specificationId";
