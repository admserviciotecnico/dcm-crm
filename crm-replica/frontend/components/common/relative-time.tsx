import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip } from '@/components/ui/tooltip';

export function RelativeTime({ value, empty = '-' }: { value?: string; empty?: string }) {
  if (!value) return <>{empty}</>;
  const date = new Date(value);
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: es });
  return <Tooltip label={date.toISOString()}>{relative}</Tooltip>;
}
