import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import type {
  AiMessage,
  EssayDocument,
  EssayRevisionReason,
  LifeItem,
  NewEssayDocument,
  NewLifeItem,
  NewRelationshipContact,
  NewPublicDraft,
  NewVaultItem,
  PublicDraft,
  RelationshipContact,
  VaultItem,
} from '@/domain/models';
import { createAiContext, createPublicDraftFromVault } from '@/domain/privacy';
import { askFrontierModel } from '@/services/ai';
import {
  removeRelationshipReminder,
  syncAllRelationshipReminders,
  syncRelationshipReminder,
} from '@/services/relationship-reminders';
import {
  addAiMessage,
  addEssayDocument,
  addLifeItem,
  addPublicDraft,
  addVaultItem,
  clearAiMessages,
  listAiMessages,
  listEssayDocuments,
  listLifeItems,
  listRelationshipContacts,
  listPublicDrafts,
  listVaultItems,
  removeVaultItem,
  removeEssayDocument,
  removeLifeItem,
  updateDraftStatus,
  updatePublicDraft,
  saveEssayDocument,
  updateLifeItem,
  updateRelationshipContact,
  addRelationshipContact,
  removeRelationshipContact,
  addRelationshipInteraction,
} from '@/storage/repository';
import {
  loadScreenshotsAllowed,
  saveScreenshotsAllowed,
} from '@/storage/screen-capture-preference';
import {
  loadDeveloperAccessEnabled,
  saveDeveloperAccessEnabled,
} from '@/storage/developer-access-preference';

type AppContextValue = {
  locked: boolean;
  loading: boolean;
  error: string | null;
  vaultItems: VaultItem[];
  drafts: PublicDraft[];
  messages: AiMessage[];
  essays: EssayDocument[];
  lifeItems: LifeItem[];
  contacts: RelationshipContact[];
  screenshotsAllowed: boolean;
  developerAccessEnabled: boolean;
  unlock: () => Promise<void>;
  lock: () => void;
  beginTrustedSiteSession: () => void;
  consumeTrustedSiteReturn: () => boolean;
  createVaultItem: (input: NewVaultItem) => Promise<void>;
  deleteVaultItem: (id: string) => Promise<void>;
  createDraft: (input: NewPublicDraft) => Promise<PublicDraft | null>;
  createDraftFromVault: (item: VaultItem) => Promise<void>;
  editDraft: (id: string, input: Pick<PublicDraft, 'title' | 'summary' | 'body' | 'nowLocation'>) => Promise<void>;
  setDraftStatus: (id: string, status: PublicDraft['status']) => Promise<void>;
  sendAiMessage: (prompt: string, draft?: PublicDraft) => Promise<void>;
  clearChat: () => Promise<void>;
  createEssay: (input: NewEssayDocument) => Promise<EssayDocument | null>;
  editEssay: (id: string, input: NewEssayDocument, reason?: EssayRevisionReason) => Promise<EssayDocument | null>;
  deleteEssay: (id: string) => Promise<void>;
  createLifeItem: (input: NewLifeItem) => Promise<void>;
  editLifeItem: (id: string, input: NewLifeItem) => Promise<void>;
  deleteLifeItem: (id: string) => Promise<void>;
  createContact: (input: NewRelationshipContact) => Promise<RelationshipContact | null>;
  editContact: (id: string, input: NewRelationshipContact) => Promise<RelationshipContact | null>;
  deleteContact: (id: string) => Promise<void>;
  logContactInteraction: (id: string, summary: string) => Promise<void>;
  setScreenshotsAllowed: (allowed: boolean) => Promise<void>;
  setDeveloperAccessEnabled: (enabled: boolean) => Promise<void>;
  dismissError: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const BACKGROUND_LOCK_DELAY_MS = 30_000;
const TRUSTED_SITE_HANDOFF_MS = 15 * 60_000;
const SCREEN_CAPTURE_PREFERENCE_KEY = 'private-companion-screen-capture-preference';
const SCREEN_CAPTURE_LOCK_KEY = 'private-companion-screen-capture-lock';
const SCREEN_CAPTURE_BACKGROUND_KEY = 'private-companion-screen-capture-background';

export function AppProvider({ children }: PropsWithChildren) {
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [drafts, setDrafts] = useState<PublicDraft[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [essays, setEssays] = useState<EssayDocument[]>([]);
  const [lifeItems, setLifeItems] = useState<LifeItem[]>([]);
  const [contacts, setContacts] = useState<RelationshipContact[]>([]);
  const [screenshotsAllowed, setScreenshotsAllowedState] = useState(false);
  const [developerAccessEnabled, setDeveloperAccessEnabledState] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const trustedSiteUntilRef = useRef(0);
  const trustedSiteReturnPendingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const applySavedScreenCapturePreference = async () => {
      // Start protected on every launch, then honor an explicit saved opt-in.
      await ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_PREFERENCE_KEY);
      const allowed = await loadScreenshotsAllowed();
      if (!active) return;
      if (allowed) await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_PREFERENCE_KEY);
      setScreenshotsAllowedState(allowed);
    };

    void applySavedScreenCapturePreference().catch(() => {
      if (active) setScreenshotsAllowedState(false);
    });
    return () => { active = false; };
  }, []);

  const setScreenshotsAllowed = useCallback(async (allowed: boolean) => {
    await saveScreenshotsAllowed(allowed);
    try {
      if (allowed) {
        await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_PREFERENCE_KEY);
      } else {
        await ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_PREFERENCE_KEY);
      }
    } catch (cause) {
      await saveScreenshotsAllowed(screenshotsAllowed);
      throw cause;
    }
    setScreenshotsAllowedState(allowed);
  }, [screenshotsAllowed]);

  useEffect(() => {
    void (locked
      ? ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_LOCK_KEY)
      : ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_LOCK_KEY));
  }, [locked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        // Screenshots may be allowed while using the app, but private content
        // must never remain visible in Android's app-switcher preview.
        void ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_BACKGROUND_KEY);
        backgroundedAtRef.current = Date.now();
        return;
      }

      void ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_BACKGROUND_KEY);

      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (!backgroundedAt) return;

      const now = Date.now();
      const returningFromTrustedSite = now <= trustedSiteUntilRef.current;
      trustedSiteUntilRef.current = 0;
      if (!developerAccessEnabled && !returningFromTrustedSite && now - backgroundedAt >= BACKGROUND_LOCK_DELAY_MS) {
        setLocked(true);
        setVaultItems([]);
        setDrafts([]);
        setMessages([]);
        setEssays([]);
        setLifeItems([]);
        setContacts([]);
      }
    });
    return () => subscription.remove();
  }, [developerAccessEnabled]);

  const reload = useCallback(async () => {
    const [nextVaultItems, nextDrafts, nextMessages, nextLifeItems, nextEssays, nextContacts] = await Promise.all([
      listVaultItems(),
      listPublicDrafts(),
      listAiMessages(),
      listLifeItems(),
      listEssayDocuments(),
      listRelationshipContacts(),
    ]);
    setVaultItems(nextVaultItems);
    setDrafts(nextDrafts);
    setMessages(nextMessages);
    setLifeItems(nextLifeItems);
    setEssays(nextEssays);
    setContacts(nextContacts);
    void syncAllRelationshipReminders(nextContacts).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;

    void loadDeveloperAccessEnabled().then(async (enabled) => {
      if (!active) return;
      setDeveloperAccessEnabledState(enabled);
      if (enabled) {
        await reload();
        if (active) setLocked(false);
      }
    }).catch(() => {
      if (active) setDeveloperAccessEnabledState(false);
    });

    return () => { active = false; };
  }, [reload]);

  const setDeveloperAccessEnabled = useCallback(async (enabled: boolean) => {
    await saveDeveloperAccessEnabled(enabled);
    setDeveloperAccessEnabledState(enabled);
    if (enabled) setLocked(false);
  }, []);

  const unlock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!developerAccessEnabled && hasHardware && enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock JGOLD',
          promptDescription: 'Use your fingerprint to open the encrypted vault.',
          promptSubtitle: 'Private data stays on this phone',
          fallbackLabel: 'Use passcode',
          biometricsSecurityLevel: 'strong',
        });
        if (!result.success) return;
      }
      await reload();
      setLocked(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not unlock the app.');
    } finally {
      setLoading(false);
    }
  }, [developerAccessEnabled, reload]);

  const createVaultItem = useCallback(async (input: NewVaultItem) => {
    try {
      const item = await addVaultItem(input);
      setVaultItems((current) => [item, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the item.');
    }
  }, []);

  const deleteVaultItem = useCallback(async (itemId: string) => {
    try {
      await removeVaultItem(itemId);
      setVaultItems((current) => current.filter((item) => item.id !== itemId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the item.');
    }
  }, []);

  const createDraft = useCallback(async (input: NewPublicDraft) => {
    try {
      const draft = await addPublicDraft(input);
      setDrafts((current) => [draft, ...current]);
      return draft;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the public draft.');
      return null;
    }
  }, []);

  const createDraftFromVault = useCallback(async (item: VaultItem) => {
    const publicCopy = createPublicDraftFromVault(item);
    await createDraft(publicCopy);
  }, [createDraft]);

  const setDraftStatus = useCallback(async (draftId: string, status: PublicDraft['status']) => {
    try {
      await updateDraftStatus(draftId, status);
      setDrafts((current) => current.map((draft) =>
        draft.id === draftId ? { ...draft, status, updatedAt: new Date().toISOString() } : draft));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the draft.');
    }
  }, []);

  const editDraft = useCallback(async (
    draftId: string,
    input: Pick<PublicDraft, 'title' | 'summary' | 'body' | 'nowLocation'>,
  ) => {
    try {
      await updatePublicDraft(draftId, input);
      setDrafts((current) => current.map((draft) => draft.id === draftId
        ? { ...draft, ...input, status: 'draft', updatedAt: new Date().toISOString() }
        : draft));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the draft.');
    }
  }, []);

  const sendAiMessage = useCallback(async (prompt: string, draft?: PublicDraft) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const userMessage = await addAiMessage('user', trimmed);
      setMessages((current) => [...current, userMessage]);
      const response = await askFrontierModel(createAiContext(trimmed, draft));
      const assistantMessage = await addAiMessage('assistant', response);
      setMessages((current) => [...current, assistantMessage]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The AI request failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearChat = useCallback(async () => {
    await clearAiMessages();
    setMessages([]);
  }, []);

  const createEssay = useCallback(async (input: NewEssayDocument) => {
    try {
      const essay = await addEssayDocument(input);
      setEssays((current) => [essay, ...current]);
      return essay;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create this essay.');
      return null;
    }
  }, []);

  const editEssay = useCallback(async (essayId: string, input: NewEssayDocument, reason: EssayRevisionReason = 'manual') => {
    try {
      const essay = await saveEssayDocument(essayId, input, reason);
      setEssays((current) => current.map((candidate) => candidate.id === essayId ? essay : candidate));
      return essay;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this essay.');
      return null;
    }
  }, []);

  const deleteEssay = useCallback(async (essayId: string) => {
    try {
      await removeEssayDocument(essayId);
      setEssays((current) => current.filter((essay) => essay.id !== essayId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this essay.');
    }
  }, []);

  const createLifeItem = useCallback(async (input: NewLifeItem) => {
    try {
      const item = await addLifeItem(input);
      setLifeItems((current) => [item, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this life item.');
    }
  }, []);

  const editLifeItem = useCallback(async (itemId: string, input: NewLifeItem) => {
    try {
      const item = await updateLifeItem(itemId, input);
      setLifeItems((current) => current.map((candidate) => candidate.id === itemId ? item : candidate));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this life item.');
    }
  }, []);

  const deleteLifeItem = useCallback(async (itemId: string) => {
    try {
      await removeLifeItem(itemId);
      setLifeItems((current) => current.filter((item) => item.id !== itemId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this life item.');
    }
  }, []);

  const createContact = useCallback(async (input: NewRelationshipContact) => {
    try {
      const contact = await addRelationshipContact(input);
      setContacts((current) => [contact, ...current]);
      void syncRelationshipReminder(contact, true).catch(() => undefined);
      return contact;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this person.');
      return null;
    }
  }, []);

  const editContact = useCallback(async (contactId: string, input: NewRelationshipContact) => {
    try {
      const contact = await updateRelationshipContact(contactId, input);
      setContacts((current) => current.map((candidate) => candidate.id === contactId ? contact : candidate));
      void syncRelationshipReminder(contact, true).catch(() => undefined);
      return contact;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this person.');
      return null;
    }
  }, []);

  const deleteContact = useCallback(async (contactId: string) => {
    try {
      await removeRelationshipContact(contactId);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      void removeRelationshipReminder(contactId).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this person.');
    }
  }, []);

  const logContactInteraction = useCallback(async (contactId: string, summary: string) => {
    if (!summary.trim()) return;
    try {
      await addRelationshipInteraction(contactId, summary);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this interaction.');
    }
  }, [reload]);

  const lock = useCallback(() => {
    trustedSiteUntilRef.current = 0;
    trustedSiteReturnPendingRef.current = false;
    setLocked(true);
    setVaultItems([]);
    setDrafts([]);
    setMessages([]);
    setLifeItems([]);
    setEssays([]);
    setContacts([]);
  }, []);

  const beginTrustedSiteSession = useCallback(() => {
    trustedSiteUntilRef.current = Date.now() + TRUSTED_SITE_HANDOFF_MS;
    trustedSiteReturnPendingRef.current = true;
  }, []);

  const consumeTrustedSiteReturn = useCallback(() => {
    if (!trustedSiteReturnPendingRef.current) return false;
    trustedSiteReturnPendingRef.current = false;
    return true;
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    locked,
    loading,
    error,
    vaultItems,
    drafts,
    messages,
    essays,
    lifeItems,
    contacts,
    screenshotsAllowed,
    developerAccessEnabled,
    unlock,
    lock,
    beginTrustedSiteSession,
    consumeTrustedSiteReturn,
    createVaultItem,
    deleteVaultItem,
    createDraft,
    createDraftFromVault,
    editDraft,
    setDraftStatus,
    sendAiMessage,
    clearChat,
    createEssay,
    editEssay,
    deleteEssay,
    createLifeItem,
    editLifeItem,
    deleteLifeItem,
    createContact,
    editContact,
    deleteContact,
    logContactInteraction,
    setScreenshotsAllowed,
    setDeveloperAccessEnabled,
    dismissError: () => setError(null),
  }), [
    locked,
    loading,
    error,
    vaultItems,
    drafts,
    messages,
    essays,
    lifeItems,
    contacts,
    screenshotsAllowed,
    developerAccessEnabled,
    unlock,
    lock,
    beginTrustedSiteSession,
    consumeTrustedSiteReturn,
    createVaultItem,
    deleteVaultItem,
    createDraft,
    createDraftFromVault,
    editDraft,
    setDraftStatus,
    sendAiMessage,
    clearChat,
    createEssay,
    editEssay,
    deleteEssay,
    createLifeItem,
    editLifeItem,
    deleteLifeItem,
    createContact,
    editContact,
    deleteContact,
    logContactInteraction,
    setScreenshotsAllowed,
    setDeveloperAccessEnabled,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider.');
  return value;
}
