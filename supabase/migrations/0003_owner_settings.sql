create table owner_settings (
  owner_id uuid primary key,
  notification_email text not null default ''
);

alter table owner_settings enable row level security;
