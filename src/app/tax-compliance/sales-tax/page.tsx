'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Building2, FileText } from 'lucide-react';

export default function SalesTaxPage() {
  const [loading, setLoading] = useState(true);
  const [nexusStates, setNexusStates] = useState<any[]>([]);
  const [pendingFilings, setPendingFilings] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const nexusRes = await fetch('/api/tax-compliance/sales-tax/nexus?action=list');
      const nexusData = await nexusRes.json();
      
      const filingsRes = await fetch('/api/tax-compliance/sales-tax/filings?type=pending');
      const filingsData = await filingsRes.json();
      
      setNexusStates(nexusData.states || []);
      setPendingFilings(filingsData.filings || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeNexus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tax-compliance/sales-tax/nexus');
      const result = await res.json();
      alert(`✅ Analyzed ${result.count} states`);
      loadData();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Sales Tax Management</h1>
            <p className="text-gray-600 mt-1">Multi-state nexus tracking and filing</p>
          </div>
          <Button onClick={analyzeNexus} disabled={loading}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Analyze Nexus
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Nexus States</p>
              <p className="text-2xl font-bold">{nexusStates.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Pending Filings</p>
              <p className="text-2xl font-bold text-orange-600">{pendingFilings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Tax Collected YTD</p>
              <p className="text-2xl font-bold text-green-600">
                ${pendingFilings.reduce((sum, f) => sum + f.taxCollected, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Economic Nexus States</CardTitle>
        </CardHeader>
        <CardContent>
          {nexusStates.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No nexus detected. Click "Analyze Nexus" to check.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nexusStates.map((state) => (
                <div key={state.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{state.state}</h3>
                    {state.hasNexus && <Badge>Has Nexus</Badge>}
                  </div>
                  <p className="text-sm text-gray-600">{state.stateName}</p>
                  <div className="mt-3 text-sm">
                    <p>Sales: <strong>${state.currentYearSales.toLocaleString()}</strong></p>
                    <p>Threshold: ${state.economicThreshold.toLocaleString()}</p>
                    {state.isRegistered && (
                      <Badge className="mt-2" variant="outline">Registered</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Filings</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingFilings.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No pending filings</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">State</th>
                  <th className="text-left py-2">Period</th>
                  <th className="text-right py-2">Tax Due</th>
                  <th className="text-left py-2">Due Date</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingFilings.map((filing) => (
                  <tr key={filing.id} className="border-b">
                    <td className="py-3">{filing.state}</td>
                    <td className="py-3">{filing.filingPeriod}</td>
                    <td className="py-3 text-right font-medium">${filing.netTaxDue.toFixed(2)}</td>
                    <td className="py-3">{new Date(filing.dueDate).toLocaleDateString()}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{filing.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
