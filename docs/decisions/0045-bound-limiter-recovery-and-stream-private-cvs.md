# 0045: Bound limiter recovery and stream private CV downloads

Status: Accepted

The authenticated heavy-user scenario exposed many failed limiter admissions
alongside CV transfer pressure. A timeout alone does not establish a Redis
outage; destroying a connection and imposing a replica-wide cooldown magnifies
one slow admission into unrelated users' failures.

Keep admissions fail-closed with a bounded 800 ms deadline. Discard a potentially
wedged connection after a timeout, without the global cooldown. Connection and
transport failures retain cooldown; commands are never replayed automatically.
The existing queue cap still bounds pending work. Tests cover hung handshakes,
hung commands, fresh requests, transport errors and mutation counts.

Serve authorized CV downloads as private S3 streams with content length and
request cancellation. Keep bucket policy, signed-upload restrictions and
per-request student/company authorization unchanged. Do not expose public GET
routes or cache session authorization to improve a benchmark.

Keep the existing PostgreSQL pool ceilings until measurements and the shared
cluster connection budget justify increasing them. Limit the check-in student
lookup to the ID and name the service uses.
