export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'unknown';

export interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  createdTime: Date;
  latestUpdate?: Date;
  psRepEmail?: string;
  ccComments: number;
  ccUpdateTime?: Date;
  leadEmail?: string;
  leadPhone?: string;
  notes?: string;
  affiliateComments?: string;
}

export interface NewLeadInput {
  name: string;
  affiliateEmail: string;
  leadEmail?: string;
  leadPhone?: string;
  notes?: string;
  initialMessage?: string;
}

export interface AffiliateComment {
  id: string;
  text: string;
  createdTime: Date;
  author?: string;
}
