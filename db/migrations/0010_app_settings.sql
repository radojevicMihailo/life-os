create table if not exists app_settings (
  id smallint primary key default 1 check (id = 1),
  google_calendar_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into app_settings (id) values (1) on conflict do nothing;
