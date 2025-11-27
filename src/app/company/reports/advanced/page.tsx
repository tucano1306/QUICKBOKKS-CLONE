'use client';

import { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import CompanyTabsLayout from '@/components/layout/company-tabs-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdvancedReportsPage() {
  const { activeCompany } = useCompany();
  const [reportType, setReportType] = useState<'analytical-ledger' | 'trial-balance' | 'legal-journal' | 'check-search'>('trial-balance');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Parámetros
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkNumber, setCheckNumber] = useState('');

  // Cargar cuentas al montar el componente
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/chart-of-accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    }
  };

  // Cargar cuentas cuando se selecciona analytical-ledger
  if (reportType === 'analytical-ledger' && accounts.length === 0) {
    loadAccounts();
  }

  const generateReport = async () => {
    if (!activeCompany) {
      setMessage({ type: 'error', text: 'Por favor selecciona una empresa' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Validaciones
    if (reportType === 'analytical-ledger' && !accountId) {
      setMessage({ type: 'error', text: 'Selecciona una cuenta para el Mayor Analítico' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (reportType === 'check-search' && !checkNumber) {
      setMessage({ type: 'error', text: 'Ingresa un número de cheque' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      let url = `/api/advanced-reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`;
      
      if (reportType === 'analytical-ledger') {
        url += `&accountId=${accountId}`;
      }
      if (reportType === 'check-search') {
        url = `/api/advanced-reports?type=check-search&checkNumber=${checkNumber}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error generando reporte');
      }
      
      const data = await response.json();
      setReportData(data);
    } catch (error: any) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: error.message || 'Error generando reporte' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Implementación simplificada - usar window.print con CSS print-friendly
    window.print();
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    let csvContent = '';
    const reportTitle = {
      'analytical-ledger': 'Mayor Analítico',
      'trial-balance': 'Balance de Comprobación',
      'legal-journal': 'Libro Diario Legal',
      'check-search': 'Búsqueda de Cheque'
    }[reportType];

    csvContent += `${reportTitle} - ${activeCompany?.name}\n`;
    csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;

    if (reportType === 'analytical-ledger') {
      csvContent += `Cuenta: ${reportData.accountCode} - ${reportData.accountName}\n`;
      csvContent += `Período: ${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}\n\n`;
      csvContent += 'Fecha,Asiento,Descripción,Débito,Crédito,Saldo\n';
      
      if (Array.isArray(reportData.transactions)) {
        reportData.transactions.forEach((tx: any) => {
          csvContent += `${new Date(tx.date).toLocaleDateString()},${tx.journalEntryNumber},"${tx.description}",${tx.debit || 0},${tx.credit || 0},${tx.balance || 0}\n`;
        });
      }
      csvContent += `\nTOTALES,,,${reportData.totalDebits || 0},${reportData.totalCredits || 0},${reportData.closingBalance || 0}\n`;
    } 
    else if (reportType === 'trial-balance') {
      csvContent += `Período: ${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}\n`;
      csvContent += `Estado: ${reportData.isBalanced ? 'Balanceado' : 'Desbalanceado'}\n\n`;
      csvContent += 'Código,Cuenta,Débitos,Créditos,Saldo\n';
      
      if (Array.isArray(reportData.accounts)) {
        reportData.accounts.forEach((account: any) => {
          csvContent += `${account.code},"${account.name}",${account.periodDebits || 0},${account.periodCredits || 0},${account.closingBalance || 0}\n`;
        });
      }
      csvContent += `\nTOTALES,,${reportData.totals?.periodDebits || 0},${reportData.totals?.periodCredits || 0},${reportData.totals?.closingBalance || 0}\n`;
    }
    else if (reportType === 'legal-journal') {
      csvContent += `Período: ${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}\n\n`;
      
      if (Array.isArray(reportData.entries)) {
        reportData.entries.forEach((entry: any) => {
          csvContent += `\nAsiento #${entry.entryNumber}\n`;
          csvContent += `Fecha: ${new Date(entry.date).toLocaleDateString()}\n`;
          csvContent += `Descripción: ${entry.description}\n`;
          csvContent += `Estado: ${entry.status}\n`;
          csvContent += 'Cuenta,Débito,Crédito\n';
          
          if (Array.isArray(entry.lines)) {
            entry.lines.forEach((line: any) => {
              csvContent += `"${line.accountName}",${line.debit || 0},${line.credit || 0}\n`;
            });
          }
          csvContent += `TOTALES,${entry.totalDebits || 0},${entry.totalCredits || 0}\n`;
        });
      }
    }

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportTitle}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderAnalyticalLedger = (data: any) => (
    <div className="space-y-4">
      {/* Message Display */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Mayor Analítico</h3>
          <p className="text-gray-600">{data.accountCode} - {data.accountName}</p>
          <p className="text-sm text-gray-500">{new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
        <div>
          <p className="text-sm text-gray-600">Saldo inicial</p>
          <p className="text-xl font-bold">${(data.openingBalance || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Movimientos netos</p>
          <p className="text-xl font-bold">${((data.totalDebits || 0) - (data.totalCredits || 0)).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Saldo final</p>
          <p className="text-xl font-bold text-blue-600">${(data.closingBalance || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asiento</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!Array.isArray(data.transactions) || data.transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay transacciones para esta cuenta en el período seleccionado
                </td>
              </tr>
            ) : (
              data.transactions.map((tx: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-sm">{tx.journalEntryNumber}</td>
                  <td className="px-4 py-2 text-sm">{tx.description}</td>
                  <td className="px-4 py-2 text-sm text-right">{(tx.debit || 0) > 0 ? `$${(tx.debit || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-2 text-sm text-right">{(tx.credit || 0) > 0 ? `$${(tx.credit || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-2 text-sm text-right font-semibold">${(tx.balance || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
            <tr className="bg-blue-50 font-bold">
              <td colSpan={3} className="px-4 py-2 text-sm">TOTALES</td>
              <td className="px-4 py-2 text-sm text-right">${(data.totalDebits || 0).toFixed(2)}</td>
              <td className="px-4 py-2 text-sm text-right">${(data.totalCredits || 0).toFixed(2)}</td>
              <td className="px-4 py-2 text-sm text-right">${(data.closingBalance || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTrialBalance = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Balance de Comprobación</h3>
          <p className="text-gray-600">{new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2 items-center">
          {data.isBalanced ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">✓ Balanceado</span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">✗ Desbalanceado</span>
          )}
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Débitos</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Créditos</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!Array.isArray(data.accounts) || data.accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No hay cuentas con movimientos en el período seleccionado
                </td>
              </tr>
            ) : (
              data.accounts.map((account: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{account.code}</td>
                  <td className="px-3 py-2">{account.name}</td>
                  <td className="px-3 py-2 text-right">${(account.periodDebits || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${(account.periodCredits || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">${(account.closingBalance || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
            <tr className="bg-blue-50 font-bold">
              <td colSpan={2} className="px-3 py-2">TOTALES</td>
              <td className="px-3 py-2 text-right">${(data.totals?.periodDebits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.periodCredits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.closingBalance || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLegalJournal = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Libro Diario Legal</h3>
          <p className="text-gray-600">{new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {!Array.isArray(data.entries) || data.entries.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No hay asientos de diario en el período seleccionado</p>
          </div>
        ) : (
          data.entries.map((entry: any, entryIdx: number) => (
            <div key={entryIdx} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">Asiento #{entry.entryNumber}</p>
                  <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">{entry.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  entry.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {entry.status}
                </span>
              </div>

              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Cuenta</th>
                    <th className="px-3 py-2 text-right">Débito</th>
                    <th className="px-3 py-2 text-right">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines?.map((line: any, lineIdx: number) => (
                    <tr key={lineIdx}>
                      <td className="px-3 py-2">{line.accountName}</td>
                      <td className="px-3 py-2 text-right">{line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2 text-right">{line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t">
                    <td className="px-3 py-2">TOTALES</td>
                    <td className="px-3 py-2 text-right">${(entry.totalDebits || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${(entry.totalCredits || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (!activeCompany) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Por favor selecciona una empresa</p>
          </div>
        </div>
      </CompanyTabsLayout>
    );
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes Contables Avanzados</h1>
          <p className="text-gray-600 mt-1">Mayor analítico, balance de comprobación, libro diario legal - {activeCompany.name}</p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {/* Selector de tipo de reporte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte:</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'analytical-ledger', label: 'Mayor Analítico', icon: '📖' },
                  { value: 'trial-balance', label: 'Balance de Comprobación', icon: '⚖️' },
                  { value: 'legal-journal', label: 'Libro Diario Legal', icon: '📒' },
                  { value: 'check-search', label: 'Búsqueda de Cheque', icon: '🔍' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value as any)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      reportType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Parámetros específicos por tipo */}
            {reportType === 'analytical-ledger' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Cuenta:</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Seleccionar cuenta --</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'check-search' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Cheque:</label>
                <Input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Ej: 1001"
                  className="max-w-xs"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin:</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button onClick={generateReport} disabled={loading} className="w-full md:w-auto">
              {loading ? 'Generando...' : '📊 Generar Reporte'}
            </Button>
          </div>
        </Card>

        {/* Resultados */}
        {reportData && (
          <Card className="p-6">
            {reportType === 'analytical-ledger' && renderAnalyticalLedger(reportData)}
            {reportType === 'trial-balance' && renderTrialBalance(reportData)}
            {reportType === 'legal-journal' && renderLegalJournal(reportData)}
            {reportType === 'check-search' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">Resultados de Búsqueda</h3>
                {reportData.results?.length > 0 ? (
                  <div className="space-y-2">
                    {reportData.results.map((result: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <p><strong>Cheque:</strong> {result.checkNumber}</p>
                        <p><strong>Fecha:</strong> {new Date(result.date).toLocaleDateString()}</p>
                        <p><strong>Beneficiario:</strong> {result.payee}</p>
                        <p><strong>Monto:</strong> ${result.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No se encontraron resultados</p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </CompanyTabsLayout>
  );
}
