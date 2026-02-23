import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { LeadForm } from './components/LeadForm';
import { LeadsTable } from './components/LeadsTable';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import {
  createLead,
  fetchAffiliateCommentsForLead,
  fetchLeads,
  isMessagingConfigured,
  sendAffiliateMessage,
} from './lib/airtable';
import type { AffiliateComment, Lead, NewLeadInput } from './types';

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchLeads();
      setLeads(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch leads from Airtable.';
      setError(message);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handleSubmitLead = useCallback(
    async (leadInput: NewLeadInput) => {
      setError(null);
      try {
        const created = await createLead(leadInput);
        setLeads((current) => [created, ...current]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create lead in Airtable.';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const handleSendMessage = useCallback(async (lead: Lead, message: string) => {
    setError(null);
    try {
      await sendAffiliateMessage(lead, message);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to send message to partner team.';
      setError(messageText);
      throw err;
    }
  }, []);

  const handleLoadComments = useCallback(async (leadId: string): Promise<AffiliateComment[]> => {
    try {
      return await fetchAffiliateCommentsForLead(leadId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load affiliate comments for the selected lead.';
      setError(message);
      return [];
    }
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const withPartnerUpdates = leads.filter((lead) => lead.ccComments > 0).length;
    const newLeads = leads.filter((lead) => lead.status === 'new').length;
    return { total, withPartnerUpdates, newLeads };
  }, [leads]);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Affiliate Lead Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Submit leads, monitor partner status updates, and communicate in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Leads</p>
            <p className="text-white text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">New Leads</p>
            <p className="text-white text-2xl font-semibold">{stats.newLeads}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Leads with Partner Comments</p>
            <p className="text-white text-2xl font-semibold">{stats.withPartnerUpdates}</p>
          </div>
        </div>

        {error && (
          <Alert className="bg-red-900/30 border-red-800 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Airtable Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <LeadForm onSubmit={handleSubmitLead} />

        {isInitialLoading ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-300">
            Loading leads from Airtable...
          </div>
        ) : (
          <LeadsTable
            leads={leads}
            isRefreshing={isRefreshing}
            messagingEnabled={isMessagingConfigured()}
            onRefresh={loadLeads}
            onSendMessage={handleSendMessage}
            onLoadComments={handleLoadComments}
          />
        )}
      </div>
    </div>
  );
}
