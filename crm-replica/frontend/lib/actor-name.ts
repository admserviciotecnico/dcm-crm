import { User } from '@/types/domain';

type ActorUser = {
  first_name?: string;
  last_name?: string;
  email?: string;
};

export function resolveActorName(user?: ActorUser | null): string {
  if (!user) return 'Sistema';

  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  if (fullName.length > 0) return fullName;

  if (user.email) return user.email;

  return 'Sistema';
}

export function resolveActorNameById(
  actorUserId?: string | null,
  usersById?: Map<string, User>
): string {
  if (!actorUserId) return 'Sistema';

  if (!usersById) return 'Sistema';

  const user = usersById.get(actorUserId);
  if (!user) return 'Sistema';

  return resolveActorName(user);
}
