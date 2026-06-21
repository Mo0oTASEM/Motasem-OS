export const cloneMock = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const nowIso = () => new Date().toISOString();
