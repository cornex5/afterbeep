create table calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  received_at timestamptz not null default now(),
  status text not null default 'received',
  caller_id_number text,
  transcript text,
  transcript_language text,
  audio_deleted_at timestamptz,
  delivered_at timestamptz,
  is_silent_or_empty boolean not null default false,
  extraction_failed boolean not null default false
);

alter table calls enable row level security;

create index calls_owner_id_created_at_idx on calls (owner_id, received_at desc);
