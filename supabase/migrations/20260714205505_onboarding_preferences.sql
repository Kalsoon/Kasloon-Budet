-- Persisted onboarding state. Existing members are deliberately opted out,
-- while rows created by private.handle_new_user receive the new defaults.
alter table public.user_preferences
  add column onboarding_completed boolean not null default false,
  add column onboarding_step smallint not null default 1,
  add column onboarding_focus text[] not null default '{}'::text[];

alter table public.user_preferences
  add constraint user_preferences_onboarding_step_check
  check (onboarding_step between 1 and 5);

update public.user_preferences
set onboarding_completed = true,
    onboarding_step = 5
where onboarding_completed = false;
