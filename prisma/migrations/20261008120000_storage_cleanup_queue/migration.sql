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
-- Permanent tombstones must stay indexed for case-insensitive attachment checks.
CREATE INDEX "StorageDeletion_kind_lower_key_idx" ON "StorageDeletion"(kind, lower(key));

-- Browsers normalize dot segments, encoded paths, backslashes and controls.
-- Reject aliases rather than infer their target before deleting stored objects.
CREATE FUNCTION storage_reference_path_is_ambiguous(reference text) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT value ~ '(^|/)[.]{1,2}(/|$)'
        OR value ~ '[[:cntrl:]%]' OR position(chr(92) in value) > 0
    FROM (SELECT split_part(split_part(btrim(reference), '?', 1), '#', 1) AS value) path;
$$;

-- One canonical mapping for both reconciliation and attachment guards. Recognize
-- UUIDs, object keys, current same-origin routes and migrated Supabase URLs.
-- Logo keys are recognized only to exclude their separate bucket from cleanup.
CREATE FUNCTION storage_object_key(kind text, reference text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path FROM CURRENT AS $$
DECLARE
    value text := split_part(split_part(btrim(reference), '?', 1), '#', 1);
    uuid_pattern text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    object_id text;
BEGIN
    IF kind NOT IN ('avatar', 'cv', 'logo') OR storage_reference_path_is_ambiguous(reference) THEN RETURN NULL; END IF;
    IF value ~ ('^' || uuid_pattern || '$') THEN
        object_id := value;
    ELSIF kind = 'avatar' THEN
        object_id := substring(value FROM ('(?:^distribution/avatar/|/avatars/distribution/avatar/|/api/media/avatar/)(' || uuid_pattern || ')$'));
    ELSIF kind = 'logo' THEN
        object_id := substring(value FROM ('(?:^distribution/logo/|/logos/distribution/logo/|/api/media/logo/)(' || uuid_pattern || ')$'));
    ELSE
        object_id := substring(value FROM ('(?:^distribution/cv/|/cvs/distribution/cv/)(' || uuid_pattern || ')\.pdf$'));
    END IF;
    IF object_id IS NULL THEN RETURN NULL; END IF;
    RETURN 'distribution/' || kind || '/' || lower(object_id) || CASE WHEN kind = 'cv' THEN '.pdf' ELSE '' END;
END;
$$;

-- A committed queue entry is a permanent tombstone. Cleanup claims keys while
-- holding table locks that conflict with INSERT/UPDATE; this volatile trigger
-- then sees the committed tombstone even for a writer that waited on that lock.
-- Capture the migration connection's schema (public locally, fallstack shared).
CREATE FUNCTION reject_deleted_storage_reference() RETURNS trigger
LANGUAGE plpgsql VOLATILE SET search_path FROM CURRENT AS $$
BEGIN
    IF storage_reference_path_is_ambiguous(to_jsonb(NEW) ->> TG_ARGV[1]) THEN
        RAISE EXCEPTION 'Ambiguous storage reference path; use a canonical URL'
            USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "StorageDeletion"
        WHERE kind = TG_ARGV[0]
          AND lower(key) = storage_object_key(TG_ARGV[0], to_jsonb(NEW) ->> TG_ARGV[1])
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
