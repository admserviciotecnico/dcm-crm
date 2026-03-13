export type DocumentEntityType = 'order' | 'client' | 'equipment';
export type DocumentCategory = 'contract' | 'report' | 'photo' | 'other';

export type DocumentItem = {
  id: string;
  name: string;
  entityType: DocumentEntityType;
  entityId: string;
  category: DocumentCategory;
  createdAt: string;
};

export type DocumentEvent = {
  id: string;
  entityType: DocumentEntityType;
  entityId: string;
  action: 'added' | 'removed';
  documentName: string;
  createdAt: string;
};
