-- Allow the JPEG fallback used by Safari versions that cannot encode WebP
-- through HTML canvas. Existing WebP objects and paths remain unchanged.
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg']
where id in ('ticket-photos', 'meter-photos', 'company-logos');
