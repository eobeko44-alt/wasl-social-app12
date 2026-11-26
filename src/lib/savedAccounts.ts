export interface SavedAccountItem {
  id: string;
  name: string;
  avatar?: string;
  phoneOrEmail?: string;
  passwordHint?: string;
  lastUsedAt: number;
}

const SAVED_ACCOUNTS_KEY = 'wasl_saved_accounts_v1';

export function getSavedAccounts(): SavedAccountItem[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
  } catch {
    return [];
  }
}

export function saveAccountToDevice(account: Omit<SavedAccountItem, 'lastUsedAt'>): SavedAccountItem[] {
  const existing = getSavedAccounts();
  const nextItem: SavedAccountItem = {
    ...account,
    lastUsedAt: Date.now(),
  };

  const filtered = existing.filter(
    (item) =>
      item.id !== account.id &&
      (!account.phoneOrEmail || item.phoneOrEmail !== account.phoneOrEmail)
  );

  const updated = [nextItem, ...filtered];
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {
    // تجاهل
  }
  return updated;
}

export function removeSavedAccount(id: string): SavedAccountItem[] {
  const updated = getSavedAccounts().filter((item) => item.id !== id);
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {
    // تجاهل
  }
  return updated;
}
