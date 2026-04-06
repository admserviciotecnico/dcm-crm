import axios from 'axios';

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function getApiErrorMessage(error: unknown, fallback = 'No se pudo completar la operación') {
  if (!error) return fallback;

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | string | undefined;
    if (typeof data === 'string') return data;

    const details = data?.details as { fieldErrors?: Record<string, unknown>; formErrors?: unknown[] } | undefined;
    const fieldErrors = details?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.entries(fieldErrors).find(([, messages]) => Array.isArray(messages) && messages.length > 0);
      if (first) {
        const [field, messages] = first;
        const messageList = Array.isArray(messages) ? messages : [];
        const firstMessage = typeof messageList[0] === 'string' && messageList[0].trim() ? messageList[0] : 'inválido';
        return `${field}: ${firstMessage}`;
      }
    }

    const message = asString(data?.message) ?? asString(data?.error) ?? asString(data?.detail);
    if (message) return message;

    const errors = data?.errors;
    if (Array.isArray(errors)) {
      const first = errors.find((item) => typeof item === 'string') as string | undefined;
      if (first) return first;
    }
  }

  if (error instanceof Error) return asString(error.message) ?? fallback;

  return fallback;
}
