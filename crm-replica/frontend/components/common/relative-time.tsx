import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip } from '@/components/ui/tooltip';

export function RelativeTime({ value, empty = '-' }: { value?: string | Date; empty?: string }) {
  if (!value) return <>{empty}</>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{empty}</>;
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: es });
  return <Tooltip label={date.toISOString()}>{relative}</Tooltip>;
}
