import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getOrCreateVaultKey } from './keys';

// Expo's withExclusiveTransactionAsync opens a fresh connection without copying
// PRAGMA key. SQLCipher requires every connection to be keyed before accessing it.
export async function withVaultTransaction<T>(task: (transaction: SQLiteDatabase) => Promise<T>): Promise<T> {
  const key = await getOrCreateVaultKey();
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('The vault key is invalid.');
  const transaction = await openDatabaseAsync('private-companion.db', { useNewConnection: true });
  let began = false;
  try {
    await transaction.execAsync(`PRAGMA key = '${key}';`);
    await transaction.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    await transaction.execAsync('BEGIN IMMEDIATE');
    began = true;
    const result = await task(transaction);
    await transaction.execAsync('COMMIT');
    began = false;
    return result;
  } catch (error) {
    if (began) await transaction.execAsync('ROLLBACK');
    throw error;
  } finally {
    await transaction.closeAsync();
  }
}
