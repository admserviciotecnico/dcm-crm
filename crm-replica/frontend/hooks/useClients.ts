'use client';

import { useCallback, useEffect, useState } from 'react';
import { Client } from '@/types/domain';
import { clientsService } from '@/services/clientsService';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);

  const load = useCallback(async () => {
    const data = await clientsService.list();
    setClients(data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { clients, reload: load };
}
