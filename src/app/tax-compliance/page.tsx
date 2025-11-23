'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Users,
  Building2
} from 'lucide-react';

interface ComplianceData {
  report?: any;
  upcoming1099s?: any[];
  overdueDeadlines?: any[];
  salesTaxDue?: any[];
  nexusStates?: any[];
}

export default function TaxCompliancePage() {
  const [loading, setLoading] = useState(true);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ComplianceData>({});

  useEffect(() => {
    loadComplianceData();
  }, [taxYear]);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      // Load compliance report
      const reportRes = await fetch(`/api/tax-compliance/compliance-report?taxYear=${taxYear}`);
      const reportData = await reportRes.json();

      // Load upcoming deadlines
      const deadlinesRes = await fetch('/api/tax-compliance/deadlines?type=upcoming&daysAhead=30');
      const deadlinesData = await deadlinesRes.json();

      // Load overdue deadlines
      const overdueRes = await fetch('/api/tax-compliance/deadlines?type=overdue');
      const overdueData = await overdueRes.json();

      // Load pending sales tax filings
      const salesTaxRes = await fetch('/api/tax-compliance/sales-tax/filings?type=pending');
      const salesTaxData = await salesTaxRes.json();

      // Load nexus states
      const nexusRes = await fetch('/api/tax-compliance/sales-tax/nexus?action=list');
      const nexusData = await nexusRes.json();

      setData({
        report: reportData.report,
        upcoming1099s: deadlinesData.deadlines?.filter((d: any) => d.taxType === 'FORM_1099') || [],
        overdueDeadlines: overdueData.deadlines || [],
        salesTaxDue: salesTaxData.filings || [],
        nexusStates: nexusData.states || [],
      });
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generate1099Forms = async () => {
    if (!confirm(`¿Generar todos los formularios 1099 para el año ${taxYear}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/tax-compliance/1099/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-generate', taxYear }),
      });
      
      const result = await res.json();
      alert(`✅ ${result.summary}`);
      loadComplianceData();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const seedDeadlines = async () => {
    if (!confirm('¿Cargar deadlines federales estándar para 2025?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/tax-compliance/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed', year: 2025 }),
      });
      
      const result = await res.json();
      alert(`✅ ${result.message} (${result.count} deadlines)`);
      loadComplianceData();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeNexus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tax-compliance/sales-tax/nexus?year=${taxYear}`);
      const result = await res.json();
      alert(`✅ Análisis completado: ${result.count} estados analizados`);
      loadComplianceData();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data.report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando compliance data...</p>
        </div>
      </div>
    );
  }

  const complianceScore = data.report?.complianceScore || 0;
  const scoreColor = complianceScore >= 90 ? 'text-green-600' : complianceScore >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Compliance Center</h1>
            <p className="text-gray-600 mt-1">IRS Forms, Sales Tax, and Deadline Management</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={taxYear} 
              onChange={(e) => setTaxYear(parseInt(e.target.value))}
              className="border rounded-lg px-4 py-2"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <Button onClick={loadComplianceData} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Compliance Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Compliance Score</p>
                <h2 className={`text-5xl font-bold ${scoreColor}`}>{complianceScore}%</h2>
              </div>
              <div className="text-right">
                <Badge 
                  variant={complianceScore >= 90 ? "default" : complianceScore >= 70 ? "secondary" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {complianceScore >= 90 ? 'Excellent' : complianceScore >= 70 ? 'Good' : 'Needs Attention'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Contractors (1099)</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.report?.totalContractors || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {data.report?.contractors1099Required || 0} require 1099
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">1099 Generated</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.report?.contractors1099Generated || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {data.report?.filingStatus?.filed || 0} filed with IRS
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Nexus States</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.nexusStates?.length || 0}</div>
            <p className="text-xs text-gray-600 mt-1">States with economic nexus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overdueDeadlines?.length || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Action required</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={generate1099Forms} className="w-full" disabled={loading}>
              <FileText className="mr-2 h-4 w-4" />
              Generate 1099 Forms ({taxYear})
            </Button>
            <Button onClick={seedDeadlines} variant="outline" className="w-full" disabled={loading}>
              <Calendar className="mr-2 h-4 w-4" />
              Load Federal Deadlines
            </Button>
            <Button onClick={analyzeNexus} variant="outline" className="w-full" disabled={loading}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Analyze Sales Tax Nexus
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues & Recommendations */}
      {(data.report?.issues?.length > 0 || data.report?.recommendations?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {data.report.issues?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Compliance Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.report.issues.map((issue: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.report.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.report.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Upcoming Deadlines */}
      {data.upcoming1099s && data.upcoming1099s.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upcoming 1099 Deadlines (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcoming1099s.slice(0, 5).map((deadline: any) => (
                <div key={deadline.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{deadline.formName}</p>
                    <p className="text-sm text-gray-600">{deadline.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{new Date(deadline.dueDate).toLocaleDateString()}</p>
                    <Badge variant={deadline.status === 'DUE_SOON' ? 'destructive' : 'secondary'}>
                      {deadline.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Tax Filings Due */}
      {data.salesTaxDue && data.salesTaxDue.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Sales Tax Filings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">State</th>
                    <th className="text-left py-2 px-4">Period</th>
                    <th className="text-right py-2 px-4">Tax Due</th>
                    <th className="text-left py-2 px-4">Due Date</th>
                    <th className="text-left py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.salesTaxDue.slice(0, 5).map((filing: any) => (
                    <tr key={filing.id} className="border-b last:border-0">
                      <td className="py-3 px-4">{filing.state}</td>
                      <td className="py-3 px-4">{filing.filingPeriod}</td>
                      <td className="py-3 px-4 text-right font-medium">${filing.netTaxDue.toFixed(2)}</td>
                      <td className="py-3 px-4">{new Date(filing.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <Badge variant={filing.status === 'DRAFT' ? 'secondary' : 'default'}>
                          {filing.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Economic Nexus States */}
      {data.nexusStates && data.nexusStates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Economic Nexus - Registered States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.nexusStates.map((state: any) => (
                <div key={state.id} className="border rounded-lg p-4">
                  <p className="font-bold text-lg">{state.state}</p>
                  <p className="text-sm text-gray-600">{state.stateName}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    ${state.currentYearSales.toLocaleString()} sales YTD
                  </p>
                  {state.isRegistered && (
                    <Badge className="mt-2" variant="default">Registered</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
