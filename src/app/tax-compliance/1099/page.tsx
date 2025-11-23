'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, CheckCircle, Download } from 'lucide-react';

export default function Form1099Page() {
  const [loading, setLoading] = useState(true);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadForms();
  }, [taxYear, selectedStatus]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const statusParam = selectedStatus !== 'all' ? `&status=${selectedStatus}` : '';
      const res = await fetch(`/api/tax-compliance/1099?taxYear=${taxYear}${statusParam}`);
      const data = await res.json();
      setForms(data.forms || []);
    } catch (error) {
      console.error('Error loading 1099s:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateForms = async () => {
    if (!confirm(`Generate all 1099 forms for ${taxYear}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/tax-compliance/1099/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-generate', taxYear }),
      });
      const result = await res.json();
      alert(`✅ ${result.summary}`);
      loadForms();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendForm = async (formId: string) => {
    if (!confirm('Send this 1099 to the recipient?')) return;
    
    try {
      const res = await fetch('/api/tax-compliance/1099', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', formId }),
      });
      await res.json();
      alert('✅ Form sent successfully!');
      loadForms();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const fileForm = async (formId: string) => {
    if (!confirm('File this 1099 with IRS?')) return;
    
    try {
      const res = await fetch('/api/tax-compliance/1099', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'file', formId }),
      });
      await res.json();
      alert('✅ Form filed with IRS!');
      loadForms();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      DRAFT: 'secondary',
      READY: 'default',
      SENT: 'default',
      FILED: 'default',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredForms = forms.filter(f => 
    selectedStatus === 'all' || f.status === selectedStatus
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Form 1099 Management</h1>
            <p className="text-gray-600 mt-1">IRS Form 1099-NEC & 1099-MISC</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={taxYear} 
              onChange={(e) => setTaxYear(parseInt(e.target.value))}
              className="border rounded-lg px-4 py-2"
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
            <Button onClick={generateForms} disabled={loading}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Forms ({taxYear})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Forms</p>
              <p className="text-2xl font-bold">{forms.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-2xl font-bold">{forms.filter(f => f.status === 'DRAFT').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold">{forms.filter(f => f.status === 'SENT').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Filed with IRS</p>
              <p className="text-2xl font-bold text-green-600">{forms.filter(f => f.status === 'FILED').length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button 
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('all')}
            >
              All ({forms.length})
            </Button>
            <Button 
              variant={selectedStatus === 'DRAFT' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('DRAFT')}
            >
              Draft
            </Button>
            <Button 
              variant={selectedStatus === 'READY' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('READY')}
            >
              Ready
            </Button>
            <Button 
              variant={selectedStatus === 'SENT' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('SENT')}
            >
              Sent
            </Button>
            <Button 
              variant={selectedStatus === 'FILED' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('FILED')}
            >
              Filed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forms Table */}
      <Card>
        <CardHeader>
          <CardTitle>1099 Forms ({filteredForms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-600">Loading...</p>
          ) : filteredForms.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No forms found. Click "Generate Forms" to create them.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Recipient</th>
                    <th className="text-left py-3 px-4">TIN</th>
                    <th className="text-left py-3 px-4">Form Type</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{form.recipientName}</p>
                        <p className="text-sm text-gray-600">{form.recipientEmail}</p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm">{form.recipientTIN.replace(/(\d{3})(\d{2})(\d{4})/, '***-**-$3')}</code>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">1099-{form.formType}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ${form.box1Amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(form.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          {form.status === 'READY' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendForm(form.id)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {form.status === 'SENT' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => fileForm(form.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              File with IRS
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Important Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>📅 <strong>January 31, {taxYear + 1}:</strong> Copy B to recipient (paper or electronic)</p>
            <p>📅 <strong>February 28, {taxYear + 1}:</strong> File with IRS (paper)</p>
            <p>📅 <strong>March 31, {taxYear + 1}:</strong> File with IRS (electronic)</p>
            <p className="text-gray-600 mt-4">⚠️ Penalty: $50-$290 per form for late filing</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
