import type { AffiliateComment, Lead, LeadStatus, NewLeadInput } from '../types';

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

type AirtableListResponse = {
  records: AirtableRecord[];
};

type AirtableCreateResponse = {
  records: AirtableRecord[];
};

const config = {
  token: import.meta.env.VITE_AIRTABLE_TOKEN as string | undefined,
  baseId: import.meta.env.VITE_AIRTABLE_BASE_ID as string | undefined,
  tableId: import.meta.env.VITE_AIRTABLE_TABLE_ID as string | undefined,
  fieldName: import.meta.env.VITE_AIRTABLE_NAME_FIELD || 'Name',
  fieldRepEmail: import.meta.env.VITE_AIRTABLE_REP_EMAIL_FIELD || 'PS Rep Email',
  fieldStatus: import.meta.env.VITE_AIRTABLE_STATUS_FIELD || 'Status',
  fieldLatestUpdate: import.meta.env.VITE_AIRTABLE_LATEST_UPDATE_FIELD || 'Latest Update',
  fieldCcComments: import.meta.env.VITE_AIRTABLE_CC_COMMENTS_FIELD || 'CC Comments',
  fieldCcUpdateTime: import.meta.env.VITE_AIRTABLE_CC_UPDATE_TIME_FIELD || 'CC Update Time',
  fieldLeadEmail: import.meta.env.VITE_AIRTABLE_LEAD_EMAIL_FIELD as string | undefined,
  fieldLeadPhone: import.meta.env.VITE_AIRTABLE_LEAD_PHONE_FIELD as string | undefined,
  fieldNotes: import.meta.env.VITE_AIRTABLE_NOTES_FIELD as string | undefined,
  fieldAffiliateComments: import.meta.env.VITE_AIRTABLE_AFFILIATE_COMMENTS_FIELD as string | undefined,
  affiliateCommentsTableId:
    (import.meta.env.VITE_AIRTABLE_AFFILIATE_COMMENTS_TABLE_ID as string | undefined) ||
    'tblrMlNIChN4hKVkM',
  affiliateCommentsLeadLinkField:
    (import.meta.env.VITE_AIRTABLE_AFFILIATE_COMMENT_LEAD_LINK_FIELD as string | undefined) || 'Lead',
  affiliateCommentsTextField:
    (import.meta.env.VITE_AIRTABLE_AFFILIATE_COMMENT_TEXT_FIELD as string | undefined) || 'Comment',
  affiliateCommentsAuthorField:
    (import.meta.env.VITE_AIRTABLE_AFFILIATE_COMMENT_AUTHOR_FIELD as string | undefined) || 'Created By',
};

function getBaseUrl() {
  if (!config.token || !config.baseId || !config.tableId) {
    throw new Error('Airtable config missing. Set VITE_AIRTABLE_TOKEN, VITE_AIRTABLE_BASE_ID, and VITE_AIRTABLE_TABLE_ID.');
  }

  return `https://api.airtable.com/v0/${config.baseId}/${config.tableId}`;
}

function getCommentsBaseUrl() {
  if (!config.token || !config.baseId || !config.affiliateCommentsTableId) {
    throw new Error(
      'Airtable comments config missing. Set VITE_AIRTABLE_TOKEN, VITE_AIRTABLE_BASE_ID, and VITE_AIRTABLE_AFFILIATE_COMMENTS_TABLE_ID.',
    );
  }

  return `https://api.airtable.com/v0/${config.baseId}/${config.affiliateCommentsTableId}`;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
  };
}

function parseDate(value: unknown): Date | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const textParts = value
      .map((item) => parseText(item))
      .filter((item): item is string => Boolean(item));
    return textParts.length ? textParts.join(', ') : undefined;
  }
  return undefined;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeStatus(raw: unknown): LeadStatus {
  if (typeof raw !== 'string') return 'unknown';
  const value = raw.toLowerCase();
  if (value === 'new') return 'new';
  if (value === 'contacted') return 'contacted';
  if (value === 'qualified') return 'qualified';
  if (value === 'converted') return 'converted';
  if (value === 'lost') return 'lost';
  return 'unknown';
}

function mapRecordToLead(record: AirtableRecord): Lead {
  const fields = record.fields;
  return {
    id: record.id,
    name: parseText(fields[config.fieldName]) || 'Unnamed Lead',
    status: normalizeStatus(fields[config.fieldStatus]),
    createdTime: new Date(record.createdTime),
    latestUpdate: parseDate(fields[config.fieldLatestUpdate]),
    psRepEmail: parseText(fields[config.fieldRepEmail]),
    ccComments: parseNumber(fields[config.fieldCcComments], 0),
    ccUpdateTime: parseDate(fields[config.fieldCcUpdateTime]),
    leadEmail: config.fieldLeadEmail ? parseText(fields[config.fieldLeadEmail]) : undefined,
    leadPhone: config.fieldLeadPhone ? parseText(fields[config.fieldLeadPhone]) : undefined,
    notes: config.fieldNotes ? parseText(fields[config.fieldNotes]) : undefined,
    affiliateComments: config.fieldAffiliateComments
      ? parseText(fields[config.fieldAffiliateComments])
      : undefined,
  };
}

function setIfConfigured(
  fields: Record<string, string | number>,
  key: string | undefined,
  value: string | undefined,
) {
  if (key && value) {
    fields[key] = value;
  }
}

function getFirstTextField(fields: Record<string, unknown>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = parseText(fields[candidate]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

async function throwIfNotOk(response: Response) {
  if (response.ok) return;
  const errorPayload = await response.json().catch(() => ({}));
  const message =
    errorPayload?.error?.message ||
    `Airtable request failed (${response.status} ${response.statusText})`;
  throw new Error(message);
}

async function fetchAllRecords(baseUrl: string, params: URLSearchParams): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const currentParams = new URLSearchParams(params);
    if (offset) {
      currentParams.set('offset', offset);
    }

    const response = await fetch(`${baseUrl}?${currentParams.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    await throwIfNotOk(response);
    const payload = (await response.json()) as AirtableListResponse & { offset?: string };
    records.push(...payload.records);
    offset = payload.offset;
  } while (offset);

  return records;
}

function recordLinksToLead(record: AirtableRecord, leadId: string): boolean {
  return Object.values(record.fields).some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => {
        if (typeof item === 'string') {
          return item === leadId;
        }
        if (item && typeof item === 'object' && 'id' in item) {
          return (item as { id?: unknown }).id === leadId;
        }
        return false;
      });
    }

    if (typeof value === 'string') {
      return value.includes(leadId);
    }

    return false;
  });
}

export async function fetchLeads(): Promise<Lead[]> {
  const url = `${getBaseUrl()}?sort%5B0%5D%5Bfield%5D=${encodeURIComponent(config.fieldLatestUpdate)}&sort%5B0%5D%5Bdirection%5D=desc`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  await throwIfNotOk(response);
  const payload = (await response.json()) as AirtableListResponse;

  return payload.records.map(mapRecordToLead);
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const fields: Record<string, string | number> = {
    [config.fieldName]: input.name,
    [config.fieldRepEmail]: input.affiliateEmail,
    [config.fieldStatus]: 'New',
  };

  setIfConfigured(fields, config.fieldLeadEmail, input.leadEmail);
  setIfConfigured(fields, config.fieldLeadPhone, input.leadPhone);
  setIfConfigured(fields, config.fieldNotes, input.notes);
  setIfConfigured(fields, config.fieldAffiliateComments, input.initialMessage);

  const response = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  await throwIfNotOk(response);
  const payload = (await response.json()) as AirtableCreateResponse;

  const created = payload.records[0];
  if (!created) {
    throw new Error('Airtable did not return created lead.');
  }

  return mapRecordToLead(created);
}

export async function sendAffiliateMessage(lead: Lead, message: string): Promise<void> {
  const fields: Record<string, string | number | string[]> = {
    [config.affiliateCommentsTextField]: message,
    [config.affiliateCommentsLeadLinkField]: [lead.id],
  };

  if (config.affiliateCommentsAuthorField) {
    fields[config.affiliateCommentsAuthorField] = 'You';
  }

  const response = await fetch(getCommentsBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  await throwIfNotOk(response);
}

export function isMessagingConfigured() {
  return Boolean(
    config.affiliateCommentsTableId &&
      config.affiliateCommentsLeadLinkField &&
      config.affiliateCommentsTextField,
  );
}

export async function fetchAffiliateCommentsForLead(leadId: string): Promise<AffiliateComment[]> {
  const formula = `FIND("${leadId}", ARRAYJOIN({${config.affiliateCommentsLeadLinkField}}))`;
  const baseUrl = getCommentsBaseUrl();
  const params = new URLSearchParams({ filterByFormula: formula });

  let records: AirtableRecord[] = [];

  try {
    records = await fetchAllRecords(baseUrl, params);
  } catch {
    records = [];
  }

  if (records.length === 0) {
    const fallbackParams = new URLSearchParams();
    records = await fetchAllRecords(baseUrl, fallbackParams);
    records = records.filter((record) => recordLinksToLead(record, leadId));
  }

  return records
    .map((record) => {
      const text =
        getFirstTextField(record.fields, [
          config.affiliateCommentsTextField,
          'Comment',
          'Message',
          'Affiliate Comment',
          'Text',
          'Name',
        ]) || '';

      const author = config.affiliateCommentsAuthorField
        ? parseText(record.fields[config.affiliateCommentsAuthorField])
        : getFirstTextField(record.fields, ['Created By', 'Author', 'From', 'Sender']);

      return {
        id: record.id,
        text,
        createdTime: new Date(record.createdTime),
        author,
      };
    })
    .filter((comment) => comment.text.trim().length > 0)
    .sort((a, b) => a.createdTime.getTime() - b.createdTime.getTime());
}
