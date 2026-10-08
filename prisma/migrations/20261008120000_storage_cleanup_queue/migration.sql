CREATE TABLE "StorageDeletion" (
    "kind" TEXT NOT NULL CHECK ("kind" IN ('avatar', 'cv')),
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    CONSTRAINT "StorageDeletion_pkey" PRIMARY KEY ("kind", "key")
);
CREATE INDEX "StorageDeletion_deletedAt_createdAt_idx" ON "StorageDeletion"("deletedAt", "createdAt");

-- One canonical mapping for both reconciliation and attachment guards. Recognize
-- UUIDs, object keys, current same-origin routes and migrated Supabase URLs.
-- Do not infer arbitrary filenames or touch logos/other prefixes.
CREATE FUNCTION storage_object_key(kind text, reference text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
    value text := split_part(split_part(btrim(reference), '?', 1), '#', 1);
    uuid_pattern text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    object_id text;
BEGIN
    IF kind NOT IN ('avatar', 'cv') THEN RETURN NULL; END IF;
    IF value ~ ('^' || uuid_pattern || '$') THEN
        object_id := value;
    ELSIF kind = 'avatar' THEN
        object_id := substring(value FROM ('(?:^distribution/avatar/|/avatars/distribution/avatar/|/api/media/avatar/)(' || uuid_pattern || ')$'));
    ELSE
        object_id := substring(value FROM ('(?:^distribution/cv/|/cvs/distribution/cv/)(' || uuid_pattern || ')\.pdf$'));
    END IF;
    IF object_id IS NULL THEN RETURN NULL; END IF;
    RETURN 'distribution/' || kind || '/' || object_id || CASE WHEN kind = 'cv' THEN '.pdf' ELSE '' END;
END;
$$;

-- A committed queue entry is a permanent tombstone. Cleanup claims keys while
-- holding table locks that conflict with INSERT/UPDATE; this volatile trigger
-- then sees the committed tombstone even for a writer that waited on that lock.
-- Capture the migration connection's schema (public locally, fallstack shared).
CREATE FUNCTION reject_deleted_storage_reference() RETURNS trigger
LANGUAGE plpgsql VOLATILE SET search_path FROM CURRENT AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "StorageDeletion"
        WHERE kind = TG_ARGV[0]
          AND key = storage_object_key(TG_ARGV[0], to_jsonb(NEW) ->> TG_ARGV[1])
    ) THEN
        RAISE EXCEPTION 'Storage object is queued for deletion; upload a new file'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER student_cv_storage_guard BEFORE INSERT OR UPDATE OF cv ON "Student"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_storage_reference('cv', 'cv');
CREATE TRIGGER student_avatar_storage_guard BEFORE INSERT OR UPDATE OF avatar ON "Student"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_storage_reference('avatar', 'avatar');
CREATE TRIGGER company_avatar_storage_guard BEFORE INSERT OR UPDATE OF avatar ON "Company"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_storage_reference('avatar', 'avatar');
CREATE TRIGGER sponsor_avatar_storage_guard BEFORE INSERT OR UPDATE OF logo ON "Sponsor"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_storage_reference('avatar', 'logo');
