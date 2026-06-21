import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const dataDir = join(process.cwd(), '.nova-local');

const readJson = async <T>(path: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
};

const writeJson = async (path: string, payload: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
};

export const localDevStore = {
  async readUserDoc<T>(userId: string, collectionName: string, docId: string) {
    return readJson<T>(join(dataDir, userId, collectionName, `${docId}.json`));
  },

  async writeUserDoc(userId: string, collectionName: string, docId: string, payload: unknown) {
    await writeJson(join(dataDir, userId, collectionName, `${docId}.json`), payload);
  },

  async listUserCollection<T>(userId: string, collectionName: string) {
    const collectionDir = join(dataDir, userId, collectionName);
    try {
      const files = await readdir(collectionDir);
      const docs: Array<T & { id: string }> = [];
      for (const file of files.filter(item => item.endsWith('.json'))) {
        const id = file.replace(/\.json$/, '');
        const data = await readJson<Record<string, unknown>>(join(collectionDir, file));
        if (data) docs.push({ id, ...data } as T & { id: string });
      }
      return docs;
    } catch {
      return [];
    }
  }
};
