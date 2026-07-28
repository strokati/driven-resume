-- Rename id -> sessionToken (Auth.js provides the token, no default needed)
ALTER TABLE "sessions" RENAME COLUMN "id" TO "sessionToken";
ALTER TABLE "sessions" ALTER COLUMN "sessionToken" DROP DEFAULT;

-- Rename expiresAt -> expires (matches @auth/prisma-adapter's expected field)
ALTER TABLE "sessions" RENAME COLUMN "expiresAt" TO "expires";
