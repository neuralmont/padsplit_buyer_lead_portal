import { useEffect, useRef, useState } from 'react';
import { format, isValid } from 'date-fns';
import { Bell, Mail, Phone, FileText, Send, MessageSquare, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import type { AffiliateComment, Lead, LeadStatus } from '../types';

interface LeadsTableProps {
  leads: Lead[];
  isRefreshing: boolean;
  messagingEnabled: boolean;
  onRefresh: () => Promise<void>;
  onSendMessage: (lead: Lead, message: string) => Promise<void>;
  onLoadComments: (leadId: string) => Promise<AffiliateComment[]>;
}

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-purple-500',
  converted: 'bg-green-500',
  lost: 'bg-gray-500',
  unknown: 'bg-slate-500',
};

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
  unknown: 'Unknown',
};

function formatTime(value?: Date) {
  if (!value || !isValid(value)) {
    return 'N/A';
  }
  return format(value, 'MMM dd, yyyy h:mm a');
}

function formatDay(value?: Date) {
  if (!value || !isValid(value)) {
    return 'N/A';
  }
  return format(value, 'MMM dd, yyyy');
}

function safeText(value: unknown, fallback = 'N/A') {
  if (typeof value === 'string') {
    return value.trim() ? value : fallback;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return fallback;
}

function isUserMessage(author: unknown) {
  return safeText(author, '').toLowerCase() === 'you';
}

export function LeadsTable({
  leads,
  isRefreshing,
  messagingEnabled,
  onRefresh,
  onSendMessage,
  onLoadComments,
}: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [comments, setComments] = useState<AffiliateComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isCommentsLoading) {
      return;
    }
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [comments, isCommentsLoading]);

  const loadComments = async (leadId: string) => {
    setComments([]);
    setIsCommentsLoading(true);
    try {
      const loaded = await onLoadComments(leadId);
      setComments(loaded);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleRowClick = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsOpen(true);
    setMessageText('');
    await loadComments(lead.id);
  };

  const handleSendMessage = async () => {
    if (!selectedLead || !messageText.trim()) {
      return;
    }

    setIsSendingMessage(true);
    try {
      await onSendMessage(selectedLead, messageText.trim());
      setMessageText('');
      await loadComments(selectedLead.id);
      await onRefresh();
    } catch {
      // Error messaging is handled at the app level.
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (leads.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Your Leads</CardTitle>
            <CardDescription className="text-gray-400">
              No leads in Airtable yet. Submit your first lead above.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-gray-900 border-gray-600 text-white hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Your Leads</CardTitle>
            <CardDescription className="text-gray-400">
              Status and updates are synced from Airtable.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-gray-900 border-gray-600 text-white hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-700/50">
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Submitted</TableHead>
                  <TableHead className="text-gray-300">Latest Update</TableHead>
                  <TableHead className="text-gray-300">Partner Comments</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => {
                      void handleRowClick(lead);
                    }}
                  >
                    <TableCell className="font-medium text-white">{safeText(lead.name, 'Unnamed Lead')}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[lead.status]} text-white`}>
                        {statusLabels[lead.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">{formatDay(lead.createdTime)}</TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-2">
                        {formatTime(lead.latestUpdate)}
                        {lead.ccComments > 0 && (
                          <div className="relative">
                            <Bell className="h-4 w-4 text-orange-500 animate-pulse" />
                            <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{lead.ccComments}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="bg-gray-900 border-gray-600 text-white hover:bg-gray-700">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="bg-gray-800 border-gray-700 text-white w-full sm:max-w-xl overflow-y-auto p-6">
          {selectedLead && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-white text-2xl">
                  {safeText(selectedLead.name, 'Unnamed Lead')}
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  Lead details, status timeline, and partner communication.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-400">Current Status</span>
                  <Badge className={`${statusColors[selectedLead.status]} text-white`}>
                    {statusLabels[selectedLead.status]}
                  </Badge>
                </div>

                <Separator className="bg-gray-700" />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  <div className="space-y-4 p-4 bg-gray-900 rounded-lg">
                    {selectedLead.psRepEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-400">Affiliate / PS Rep Email</p>
                          <p className="text-sm text-white">{safeText(selectedLead.psRepEmail)}</p>
                        </div>
                      </div>
                    )}
                    {selectedLead.leadEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-400">Lead Email</p>
                          <p className="text-sm text-white">{safeText(selectedLead.leadEmail)}</p>
                        </div>
                      </div>
                    )}
                    {selectedLead.leadPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-400">Lead Phone</p>
                          <p className="text-sm text-white">{safeText(selectedLead.leadPhone)}</p>
                        </div>
                      </div>
                    )}
                    {!selectedLead.leadEmail && !selectedLead.leadPhone && !selectedLead.psRepEmail && (
                      <p className="text-sm text-gray-400">No contact details available in Airtable.</p>
                    )}
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Timeline</h3>
                  <div className="space-y-3 p-4 bg-gray-900 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Submitted</span>
                      <span className="text-white">{formatTime(selectedLead.createdTime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Latest Update</span>
                      <span className="text-white">{formatTime(selectedLead.latestUpdate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Partner Comment Count</span>
                      <span className="text-white">{selectedLead.ccComments}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Partner Update Time</span>
                      <span className="text-white">{formatTime(selectedLead.ccUpdateTime)}</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Your Messages to Partner Team
                  </h3>

                  <ScrollArea className="h-[180px] rounded-md border border-gray-700 p-4 bg-gray-900">
                    {isCommentsLoading ? (
                      <p className="text-sm text-gray-400 text-center py-4">Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No affiliate messages recorded on this lead yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className={`flex ${isUserMessage(comment.author) ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 space-y-1 ${
                                isUserMessage(comment.author)
                                  ? 'bg-blue-600/80 text-white'
                                  : 'bg-gray-800 border border-gray-700 text-white'
                              }`}
                            >
                              <p className="text-xs text-gray-300">
                                {formatTime(comment.createdTime)}
                                {comment.author ? ` · ${safeText(comment.author)}` : ''}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{safeText(comment.text, '')}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={commentsEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder={
                        messagingEnabled
                          ? 'Send message to partner team...'
                          : 'Configure affiliate comments table settings in .env to enable messaging.'
                      }
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                      disabled={!messagingEnabled}
                    />
                    <Button
                      onClick={() => {
                        void handleSendMessage();
                      }}
                      disabled={!messagingEnabled || !messageText.trim() || isSendingMessage}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedLead.notes && (
                  <>
                    <Separator className="bg-gray-700" />

                    <div className="space-y-3 pb-6">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Lead Notes
                      </h3>
                      <div className="p-4 bg-gray-900 border border-gray-700 rounded-md">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">
                          {safeText(selectedLead.notes)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
