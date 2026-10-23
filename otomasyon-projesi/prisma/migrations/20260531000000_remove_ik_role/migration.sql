-- Move existing IK users to the stajyer role before removing IK from the enum.
UPDATE "users"
SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'ADAY')
WHERE "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'IK');

DELETE FROM "roles" WHERE "name" = 'IK';

ALTER TYPE "RoleName" RENAME TO "RoleName_old";
CREATE TYPE "RoleName" AS ENUM ('ADAY', 'YONETICI');
ALTER TABLE "roles" ALTER COLUMN "name" TYPE "RoleName" USING ("name"::text::"RoleName");
DROP TYPE "RoleName_old";
