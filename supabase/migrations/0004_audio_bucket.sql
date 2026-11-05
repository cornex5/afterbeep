insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('calls', 'calls', false, 10485760, array['audio/wav','audio/webm','audio/mpeg','audio/mp4'])
on conflict (id) do nothing;
