export type ClientContact = {
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  area?: string;
};

const PREFIX = '__contacts_json__:';

export function parseClientObservaciones(observaciones?: string): { contacts: ClientContact[]; observaciones: string } {
  if (!observaciones) return { contacts: [], observaciones: '' };
  if (!observaciones.startsWith(PREFIX)) return { contacts: [], observaciones };

  const lines = observaciones.split('\n');
  const firstLine = lines[0] ?? '';
  const rawJson = firstLine.slice(PREFIX.length).trim();
  const rest = lines.slice(1).join('\n').trim();

  try {
    const parsed = JSON.parse(rawJson) as ClientContact[];
    const contacts = Array.isArray(parsed) ? parsed : [];
    return { contacts, observaciones: rest };
  } catch {
    return { contacts: [], observaciones: observaciones.replace(PREFIX, '').trim() };
  }
}

export function serializeClientObservaciones(contacts: ClientContact[], observaciones: string): string {
  const json = JSON.stringify(contacts);
  const clean = observaciones.trim();
  return `${PREFIX}${json}${clean ? `\n\n${clean}` : ''}`;
}

export function getPrimaryContact(contacts: ClientContact[]): ClientContact | null {
  return contacts.length > 0 ? contacts[0] : null;
}
