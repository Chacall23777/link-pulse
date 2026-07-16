CREATE UNIQUE INDEX IF NOT EXISTS group_joins_link_platform_user_uidx
  ON public.group_joins (link_id, platform, platform_user_id)
  WHERE platform_user_id IS NOT NULL;