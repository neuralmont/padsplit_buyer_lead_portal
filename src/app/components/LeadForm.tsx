import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import type { NewLeadInput } from '../types';

interface LeadFormProps {
  onSubmit: (lead: NewLeadInput) => Promise<void>;
}

const initialState: NewLeadInput = {
  name: '',
  affiliateEmail: '',
  leadEmail: '',
  leadPhone: '',
  notes: '',
  initialMessage: '',
};

export function LeadForm({ onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<NewLeadInput>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.affiliateEmail.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        affiliateEmail: formData.affiliateEmail.trim(),
        leadEmail: formData.leadEmail?.trim(),
        leadPhone: formData.leadPhone?.trim(),
        notes: formData.notes?.trim(),
        initialMessage: formData.initialMessage?.trim(),
      });
      setFormData(initialState);
    } catch {
      // Error messaging is handled at the app level.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Submit New Lead</CardTitle>
        <CardDescription className="text-gray-400">
          New submissions are saved directly to Airtable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-200">Lead Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Diane"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliateEmail" className="text-gray-200">Affiliate Email (PS Rep Email) *</Label>
              <Input
                id="affiliateEmail"
                type="email"
                placeholder="affiliate@yourcompany.com"
                value={formData.affiliateEmail}
                onChange={(e) => setFormData({ ...formData, affiliateEmail: e.target.value })}
                required
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadEmail" className="text-gray-200">Lead Email</Label>
              <Input
                id="leadEmail"
                type="email"
                placeholder="lead@example.com"
                value={formData.leadEmail}
                onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadPhone" className="text-gray-200">Lead Phone</Label>
              <Input
                id="leadPhone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.leadPhone}
                onChange={(e) => setFormData({ ...formData, leadPhone: e.target.value })}
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-200">Lead Notes</Label>
            <Textarea
              id="notes"
              placeholder="Property details, budget, and any lead context..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialMessage" className="text-gray-200">Message to Partner Team</Label>
            <Textarea
              id="initialMessage"
              placeholder="Share anything the partner team should know immediately..."
              value={formData.initialMessage}
              onChange={(e) => setFormData({ ...formData, initialMessage: e.target.value })}
              rows={3}
              className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Lead'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
