'use client';

import { useCallback, useEffect, useState } from 'react';
import { Equipment } from '@/types/domain';
import { equipmentsService } from '@/services/equipmentsService';

export function useEquipments() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const load = useCallback(async () => {
    const data = await equipmentsService.list();
    setEquipments(data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { equipments, reload: load };
}
