import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_DIR = `${FileSystem.documentDirectory}trampvision`;
const RESULTS_FILE = `${STORAGE_DIR}/results.json`;

async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
  }
}

export const storage = {
  async getItem(key: string) {
    try {
      await ensureDir();
      const content = await FileSystem.readAsStringAsync(RESULTS_FILE);
      const data = JSON.parse(content);
      return data[key] || null;
    } catch (e) {
      console.log(`[storage] getItem ${key} - file may not exist yet`);
      return null;
    }
  },

  async setItem(key: string, value: string) {
    try {
      await ensureDir();
      let data: any = {};
      try {
        const content = await FileSystem.readAsStringAsync(RESULTS_FILE);
        data = JSON.parse(content);
      } catch (e) {
        // File doesn't exist yet
      }
      data[key] = value;
      await FileSystem.writeAsStringAsync(RESULTS_FILE, JSON.stringify(data));
      console.log(`[storage] setItem ${key} - saved`);
    } catch (e) {
      console.error(`[storage] setItem ${key} failed:`, e);
      throw e;
    }
  },
};
