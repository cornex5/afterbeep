create table message_cards (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references calls (id) on delete cascade,
  owner_id uuid not null,
  caller_name text not null,
  callback_number text not null,
  reason text not null,
  urgency text not null,
  suggested_reply text not null,
  extracted_at timestamptz not null default now(),
  handled_at timestamptz,
  expires_at timestamptz not null
);

alter table message_cards enable row level security;
