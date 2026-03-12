import { ServiceOrder, User } from '@/types/domain';

export type AnalyticsFilters = {
  from?: string;
  to?: string;
  technicianId?: string;
  clientId?: string;
};

export type AnalyticsDataset = {
  orders: ServiceOrder[];
  users: User[];
};
