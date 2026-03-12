export type DocumentItem = {
  id: string;
  name: string;
  entityType: 'order' | 'client' | 'equipment';
  entityId: string;
  createdAt: string;
};
