import {
  Contact,
  addContactsChangeListener,
  ContactField,
  ContactsSortOrder,
  getPermissionsAsync,
  requestPermissionsAsync,
  type ContactDate,
  type ExistingAddress,
  type ExistingDate,
} from 'expo-contacts';
import * as LegacyContacts from 'expo-contacts/legacy';
import { AppState } from 'react-native';
import { onSyncedData } from './device-sync-events';
import * as SecureStore from 'expo-secure-store';
import { pendingDeviceContacts, clearPendingDeviceContact } from '@/storage/device-contact-pending';

import type { NewRelationshipContact, RelationshipContact } from '@/domain/models';
import { addRelationshipContact, listRelationshipContacts, updateRelationshipContact } from '@/storage/repository';

import { approximateContactCoordinates } from './contact-locations';

export type PhoneSyncMode = 'off' | 'import' | 'two-way';
export type PhoneSyncResult = { imported: number; updated: number; exported: number; total: number };

const PHONE_SYNC_MODE_KEY = 'jgold-phone-contact-sync-mode';
const SECURE_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;
const FIELDS = [
  ContactField.FULL_NAME,
  ContactField.GIVEN_NAME,
  ContactField.MIDDLE_NAME,
  ContactField.FAMILY_NAME,
  ContactField.COMPANY,
  ContactField.JOB_TITLE,
  ContactField.IS_FAVOURITE,
  ContactField.BIRTHDAY,
  ContactField.DATES,
  ContactField.EMAILS,
  ContactField.PHONES,
  ContactField.ADDRESSES,
  ContactField.URL_ADDRESSES,
  ContactField.IMAGE,
  ContactField.THUMBNAIL,
] as const;

type DeviceContact = Awaited<ReturnType<typeof Contact.getAllDetails<typeof FIELDS>>>[number];

const clean = (value: string | null | undefined) => value?.trim() ?? '';
const phoneKey = (value: string) => value.replace(/\D/g, '');
const emailKey = (value: string) => value.trim().toLocaleLowerCase();
const nameKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

function formattedBirthday(value?: ContactDate | null) {
  if (!value?.month || !value.day) return '';
  const month = String(value.month).padStart(2, '0');
  const day = String(value.day).padStart(2, '0');
  return value.year ? `${value.year}-${month}-${day}` : `${month}-${day}`;
}

function birthdayFor(person: DeviceContact) {
  if (person.birthday) return formattedBirthday(person.birthday);
  const birthday = person.dates?.find((date: ExistingDate) => clean(date.label).toLocaleLowerCase().includes('birthday'));
  return formattedBirthday(birthday?.date);
}

function locationFor(address?: ExistingAddress) {
  if (!address) return '';
  return [address.street, address.city, address.state || address.region, address.postcode, address.country].map(clean).filter(Boolean).join(', ');
}

function inputFromDevice(person: DeviceContact, existing?: RelationshipContact): NewRelationshipContact | null {
  const name = clean(person.fullName) || [person.givenName, person.middleName, person.familyName].map(clean).filter(Boolean).join(' ');
  if (!name) return null;
  const location = locationFor(person.addresses?.[0]) || existing?.location || '';
  const coordinates = approximateContactCoordinates(location);
  return {
    name,
    company: clean(person.company),
    role: clean(person.jobTitle),
    email: clean(person.emails?.[0]?.address),
    phone: clean(person.phones?.[0]?.number),
    website: clean(person.urlAddresses?.[0]?.url),
    location,
    latitude: existing?.latitude ?? coordinates?.latitude ?? null,
    longitude: existing?.longitude ?? coordinates?.longitude ?? null,
    birthday: birthdayFor(person) || existing?.birthday || '',
    imageUri: clean(person.thumbnail) || clean(person.image) || existing?.imageUri || '',
    favorite: Boolean(person.isFavourite),
    deviceContactId: person.id,
    tags: existing?.tags ?? [],
    notes: existing?.notes ?? '',
    cadenceDays: existing?.cadenceDays ?? 30,
    nextFollowUpAt: existing?.nextFollowUpAt ?? null,
    firstMetAt: existing?.firstMetAt ?? null,
    firstMetPlace: existing?.firstMetPlace ?? '',
  };
}

function inputFromLegacy(person: LegacyContacts.ExistingContact, existing?: RelationshipContact): NewRelationshipContact | null {
  const name = clean(person.name) || [person.firstName, person.middleName, person.lastName].map(clean).filter(Boolean).join(' ');
  if (!name) return null;
  const address = person.addresses?.[0];
  const location = address ? [address.street, address.city, address.region, address.postalCode, address.country].map(clean).filter(Boolean).join(', ') : existing?.location ?? '';
  const coordinates = approximateContactCoordinates(location);
  return {
    name,
    company: clean(person.company),
    role: clean(person.jobTitle),
    email: clean(person.emails?.[0]?.email),
    phone: clean(person.phoneNumbers?.[0]?.number),
    website: clean(person.urlAddresses?.[0]?.url),
    location,
    latitude: existing?.latitude ?? coordinates?.latitude ?? null,
    longitude: existing?.longitude ?? coordinates?.longitude ?? null,
    birthday: formattedBirthday(person.birthday) || existing?.birthday || '',
    imageUri: clean(person.image?.uri) || existing?.imageUri || '',
    favorite: Boolean(person.isFavorite),
    deviceContactId: person.id,
    tags: existing?.tags ?? [],
    notes: existing?.notes ?? '',
    cadenceDays: existing?.cadenceDays ?? 30,
    nextFollowUpAt: existing?.nextFollowUpAt ?? null,
    firstMetAt: existing?.firstMetAt ?? null,
    firstMetPlace: existing?.firstMetPlace ?? '',
  };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { givenName: parts.slice(0, -1).join(' ') || parts[0] || '', familyName: parts.length > 1 ? parts.at(-1) ?? '' : '' };
}

export function subscribePhoneContactChanges(refresh: () => void): () => void {
  const contacts = addContactsChangeListener(refresh);
  const foreground = AppState.addEventListener('change', state => {
    if (state === 'active') refresh();
  });
  const remote = onSyncedData(refresh, ['relationship_contacts']);
  return () => { contacts.remove(); foreground.remove(); remote(); };
}

function unchangedContact(existing: RelationshipContact, input: NewRelationshipContact) {
  return Object.entries(input).every(([key, value]) =>
    JSON.stringify(existing[key as keyof RelationshipContact]) === JSON.stringify(value));
}

export async function getPhoneSyncMode(): Promise<PhoneSyncMode> {
  const value = await SecureStore.getItemAsync(PHONE_SYNC_MODE_KEY, SECURE_OPTIONS);
  return value === 'import' || value === 'two-way' ? value : 'off';
}

export async function setPhoneSyncMode(mode: PhoneSyncMode) {
  await SecureStore.setItemAsync(PHONE_SYNC_MODE_KEY, mode, SECURE_OPTIONS);
}

async function ensurePermission(request: boolean) {
  const current = await getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!request) return false;
  const next = await requestPermissionsAsync();
  return next.status === 'granted';
}

export async function pushRelationshipContactToPhone(contact: RelationshipContact) {
  if (await getPhoneSyncMode() !== 'two-way' || !await ensurePermission(false)) return contact;
  const names = splitName(contact.name);
  if (!contact.deviceContactId) {
    try {
      const created = await Contact.create({
        ...names,
        company: contact.company || undefined,
        jobTitle: contact.role || undefined,
        isFavourite: contact.favorite,
        addresses: contact.location ? [{ label: 'home', street: contact.location }] : [],
        emails: contact.email ? [{ label: 'main', address: contact.email }] : [],
        phones: contact.phone ? [{ label: 'mobile', number: contact.phone }] : [],
        urlAddresses: contact.website ? [{ label: 'homepage', url: contact.website }] : [],
      });
      return updateRelationshipContact(contact.id, { ...contact, deviceContactId: created.id });
    } catch {
      const id = await LegacyContacts.addContactAsync({
        contactType: LegacyContacts.ContactTypes.Person,
        name: contact.name,
        firstName: names.givenName,
        lastName: names.familyName,
        company: contact.company,
        jobTitle: contact.role,
        isFavorite: contact.favorite,
        addresses: contact.location ? [{ label: 'home', street: contact.location }] : [],
        emails: contact.email ? [{ label: 'main', email: contact.email }] : [],
        phoneNumbers: contact.phone ? [{ label: 'mobile', number: contact.phone }] : [],
        urlAddresses: contact.website ? [{ label: 'homepage', url: contact.website }] : [],
      });
      return updateRelationshipContact(contact.id, { ...contact, deviceContactId: id });
    }
  }

  const device = new Contact(contact.deviceContactId);
  let details;
  try {
    details = await device.getDetails([ContactField.EMAILS, ContactField.PHONES, ContactField.URL_ADDRESSES, ContactField.ADDRESSES] as const);
  } catch {
    // The installed Android runtime may only expose Expo's legacy bridge.
    // Update that same address-book record, preserving its additional fields.
    const existing = await LegacyContacts.getContactByIdAsync(contact.deviceContactId);
    if (!existing) throw new Error(`The phone contact for ${contact.name} is no longer available.`);
    const emails = existing.emails ?? [];
    const phones = existing.phoneNumbers ?? [];
    const urls = existing.urlAddresses ?? [];
    const addresses = existing.addresses ?? [];
    const firstAddress = addresses[0];
    const savedLocation = firstAddress ? [firstAddress.street, firstAddress.city, firstAddress.region, firstAddress.postalCode, firstAddress.country].map(clean).filter(Boolean).join(', ') : '';
    await LegacyContacts.updateContactAsync({
      ...existing, name: contact.name, firstName: names.givenName, lastName: names.familyName,
      company: contact.company, jobTitle: contact.role, isFavorite: contact.favorite,
      // Preserve secondary addresses and structured fields unless the user edited the location.
      addresses: savedLocation === contact.location ? addresses : [
        { ...(firstAddress ?? { label: 'home' }), street: contact.location, city: '', region: '', postalCode: '', country: '', isoCountryCode: '' }, ...addresses.slice(1),
      ],
      emails: contact.email ? [{ ...(emails[0] ?? { label: 'main' }), email: contact.email }, ...emails.slice(1)] : emails,
      phoneNumbers: contact.phone ? [{ ...(phones[0] ?? { label: 'mobile' }), number: contact.phone }, ...phones.slice(1)] : phones,
      urlAddresses: contact.website ? [{ ...(urls[0] ?? { label: 'homepage' }), url: contact.website }, ...urls.slice(1)] : urls,
    });
    return contact;
  }
  const emails = details.emails ?? [];
  const phones = details.phones ?? [];
  const urls = details.urlAddresses ?? [];
  const addresses = details.addresses ?? [];
  await device.patch({
    ...names,
    company: contact.company || null,
    jobTitle: contact.role || null,
    isFavourite: contact.favorite,
    addresses: locationFor(addresses[0]) === contact.location ? addresses : [
      { ...(addresses[0] ?? { label: 'home' }), street: contact.location, city: '', state: '', region: '', postcode: '', country: '' }, ...addresses.slice(1),
    ],
    emails: contact.email ? [{ ...(emails[0]?.id ? emails[0] : { label: 'main' }), address: contact.email }, ...emails.slice(1)] : emails,
    phones: contact.phone ? [{ ...(phones[0]?.id ? phones[0] : { label: 'mobile' }), number: contact.phone }, ...phones.slice(1)] : phones,
    urlAddresses: contact.website ? [{ ...(urls[0]?.id ? urls[0] : { label: 'homepage' }), url: contact.website }, ...urls.slice(1)] : urls,
  });
  return contact;
}

let contactSync: Promise<PhoneSyncResult> | null = null;
let nextContactSync: { mode: Exclude<PhoneSyncMode, 'off'>; request: boolean } | null = null;
export function syncPhoneContacts(mode: Exclude<PhoneSyncMode, 'off'>, request = false): Promise<PhoneSyncResult> {
  nextContactSync = { mode, request: request || (nextContactSync?.request ?? false) };
  if (contactSync) return contactSync;
  contactSync = (async () => {
    const total: PhoneSyncResult = { imported: 0, updated: 0, exported: 0, total: 0 };
    while (nextContactSync) {
      const next = nextContactSync;
      nextContactSync = null;
      const result = await performPhoneContactSync(next.mode, next.request);
      total.imported += result.imported;
      total.updated += result.updated;
      total.exported += result.exported;
      total.total = result.total;
    }
    return total;
  })().finally(() => { contactSync = null; nextContactSync = null; });
  return contactSync;
}
async function performPhoneContactSync(mode: Exclude<PhoneSyncMode, 'off'>, request: boolean): Promise<PhoneSyncResult> {
  if (!await ensurePermission(request)) throw new Error('Contacts permission is required to sync your phone address book.');
  await setPhoneSyncMode(mode);
  const pending = await pendingDeviceContacts();
  if (mode === 'two-way' && pending.size) {
    // Apply edits received from the other JGOLD device before importing the
    // address book, so its older copy cannot silently undo a desktop edit.
    const contacts = await listRelationshipContacts();
    for (const id of pending) {
      const contact = contacts.find(item => item.id === id);
      if (contact) await pushRelationshipContactToPhone(contact);
      await clearPendingDeviceContact(id);
    }
    pending.clear();
  }
  let deviceContacts: DeviceContact[] = [];
  try {
    deviceContacts = await Contact.getAllDetails(FIELDS, { sortOrder: ContactsSortOrder.UserDefault });
  } catch {
    // Installed builds from before Expo's class API use the compatible legacy bridge.
  }
  let local = await listRelationshipContacts();
  const byDeviceId = new Map(local.filter((item) => item.deviceContactId).map((item) => [item.deviceContactId, item]));
  const byEmail = new Map(local.filter((item) => item.email).map((item) => [emailKey(item.email), item]));
  const byPhone = new Map(local.filter((item) => item.phone).map((item) => [phoneKey(item.phone), item]));
  const byName = new Map(local.map((item) => [nameKey(item.name), item]));
  let imported = 0;
  let updated = 0;
  let exported = 0;

  for (const person of deviceContacts) {
    const email = clean(person.emails?.[0]?.address);
    const phone = clean(person.phones?.[0]?.number);
    const fullName = clean(person.fullName) || [person.givenName, person.middleName, person.familyName].map(clean).filter(Boolean).join(' ');
    const existing = byDeviceId.get(person.id)
      ?? (email ? byEmail.get(emailKey(email)) : undefined)
      ?? (phone ? byPhone.get(phoneKey(phone)) : undefined)
      ?? (!email && !phone ? byName.get(nameKey(fullName)) : undefined);
    const input = inputFromDevice(person, existing);
    if (!input) continue;
    if (existing && pending.has(existing.id)) continue;
    if (existing) {
      if (unchangedContact(existing, input)) continue;
      const next = await updateRelationshipContact(existing.id, input);
      byDeviceId.set(person.id, next);
      updated += 1;
    } else {
      const next = await addRelationshipContact(input);
      byDeviceId.set(person.id, next);
      imported += 1;
    }
  }

  if (!deviceContacts.length) {
    const response = await LegacyContacts.getContactsAsync({ fields: [
      LegacyContacts.Fields.Name,
      LegacyContacts.Fields.Emails,
      LegacyContacts.Fields.PhoneNumbers,
      LegacyContacts.Fields.Company,
      LegacyContacts.Fields.JobTitle,
      LegacyContacts.Fields.Addresses,
      LegacyContacts.Fields.UrlAddresses,
      LegacyContacts.Fields.Birthday,
      LegacyContacts.Fields.Image,
      LegacyContacts.Fields.IsFavorite,
    ] });
    for (const person of response.data) {
      const email = clean(person.emails?.[0]?.email);
      const phone = clean(person.phoneNumbers?.[0]?.number);
      const existing = byDeviceId.get(person.id)
        ?? (email ? byEmail.get(emailKey(email)) : undefined)
        ?? (phone ? byPhone.get(phoneKey(phone)) : undefined)
        ?? (!email && !phone ? byName.get(nameKey(person.name)) : undefined);
      const input = inputFromLegacy(person, existing);
      if (!input) continue;
      if (existing && pending.has(existing.id)) continue;
      if (existing) {
        if (unchangedContact(existing, input)) continue;
        const next = await updateRelationshipContact(existing.id, input);
        byDeviceId.set(person.id, next);
        updated += 1;
      } else {
        const next = await addRelationshipContact(input);
        byDeviceId.set(person.id, next);
        imported += 1;
      }
    }
  }

  if (mode === 'two-way') {
    local = await listRelationshipContacts();
    for (const contact of local.filter((item) => !item.deviceContactId)) {
      await pushRelationshipContactToPhone(contact);
      exported += 1;
    }
  }

  const synced = await listRelationshipContacts();
  return { imported, updated, exported, total: synced.length };
}
