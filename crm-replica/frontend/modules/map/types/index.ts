import { ServiceOrder, User } from '@/types/domain';

export type TechnicianLocation = {
  technician: User;
  order: ServiceOrder;
  address: string;
};
