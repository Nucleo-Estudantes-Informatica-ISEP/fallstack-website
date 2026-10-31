# Upload company MP4 videos

Status: Accepted

## Context

Company representatives supply MP4 files as well as YouTube links. CGI supplied a
190 MB H.264/AAC video. Buffering multipart uploads or full playback responses
would waste memory on the application servers.

## Decision

Keep YouTube embeds and accept MP4 uploads from authenticated admins, up to
256 MiB. The editor uploads the raw file when saving a non-empty profile. The
server enforces both declared and streamed size limits, checks the MP4 file-type
box, spools to a private temporary file, streams it into MinIO, and removes the
temporary file after success, failure or cancellation. H.264/AAC is the supported
browser encoding; container validation does not transcode or guarantee codecs.

Reuse the edition's logo bucket with a separate `distribution/video/<uuid>.mp4`
prefix and canonical `/api/media/video/<uuid>` URLs in CompanyProfile.videoHref.
No schema migration, new bucket, browser credentials or external media origin is
needed. Existing storage credentials must permit that prefix. Save rejects
missing uploaded objects. External file URLs and encoded aliases are rejected.

Stream playback through the app with byte ranges and HEAD support, native
controls, metadata-only preload, and no autoplay. The public route requires an
active company with that exact profile URL and a rank allowing internal pages
and promotional videos. Responses are not cached, so deactivation or rank changes
take effect without a stale media response. YouTube embeds retain their current
validation and CSP; same-origin MP4 uses the existing default-src self policy.

## Consequences

Large uploads need writable temporary disk space and proxy request limits above
256 MiB. Raw upload avoids multipart buffering; files are never committed to Git.
Only published, entitled company videos can be played. A failed profile save can
leave an unreferenced admin upload; videos, like logos, are retained for manual
edition maintenance and excluded from student avatar/CV retention cleanup.
Replacement does not delete an older file automatically. No student upload or
video transcoding is added. Changes ship through dev and a reviewed production
promotion before production content is attached.
