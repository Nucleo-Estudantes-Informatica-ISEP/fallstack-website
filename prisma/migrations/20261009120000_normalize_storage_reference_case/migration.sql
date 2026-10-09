-- Normalize UUID comparisons while keeping literal, case-sensitive S3 queue keys.
CREATE OR REPLACE FUNCTION storage_object_key(kind text, reference text) RETURNS text
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
    RETURN 'distribution/' || kind || '/' || lower(object_id) || CASE WHEN kind = 'cv' THEN '.pdf' ELSE '' END;
END;
$$;

-- A committed queue entry is a permanent tombstone. Cleanup claims keys while
-- holding table locks that conflict with INSERT/UPDATE; this volatile trigger
-- then sees the committed tombstone even for a writer that waited on that lock.
-- Capture the migration connection's schema (public locally, fallstack shared).
CREATE OR REPLACE FUNCTION reject_deleted_storage_reference() RETURNS trigger
LANGUAGE plpgsql VOLATILE SET search_path FROM CURRENT AS $$
BEGIN
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

