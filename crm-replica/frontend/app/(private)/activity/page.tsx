'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { appStore } from '@/stores/app-store';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

export default function ActivityPage() {
  const notifications = appStore((s) => s.notifications);
  const feed = useMemo(() => notifications.map((n) => ({ ...n, actor: 'Sistema' })), [notifications]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Activity Feed</h1>
      <Card>
        <div className="space-y-2">
          {feed.length === 0 ? <p className="text-sm text-slate-400">Sin actividad reciente.</p> : feed.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded border border-slate-700 p-3">
              <Avatar name={item.actor} />
              <div>
                <p className="text-sm"><span className="font-semibold">{item.actor}</span> · {item.title}</p>
                <p className="text-sm text-slate-300">{item.message}</p>
                <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
