'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdvancedReportsPage() {
  const [reportType, setReportType] = useState<'analytical-ledger' | 'trial-balance' | 'legal-journal' | 'check-search'>('trial-balance');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  
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
    // Validaciones
    if (reportType === 'analytical-ledger' && !accountId) {
      alert('Por favor selecciona una cuenta para el Mayor Analítico');
      return;
    }
    if (reportType === 'check-search' && !checkNumber) {
      alert('Por favor ingresa un número de cheque');
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
      alert(error.message || 'Error generando reporte');
    } finally {
      setLoading(false);
    }
  };

  const renderAnalyticalLedger = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Mayor Analítico</h3>
          <p className="text-gray-600">{data.accountCode} - {data.accountName}</p>
          <p className="text-sm text-gray-500">{new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}</p>
        </div>
        <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
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
          <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo Inicial Débito</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo Inicial Crédito</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Débitos Período</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Créditos Período</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo Final Débito</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo Final Crédito</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!Array.isArray(data.accounts) || data.accounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No hay cuentas con movimientos en el período seleccionado
                </td>
              </tr>
            ) : (
              data.accounts.map((account: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{account.code}</td>
                  <td className="px-3 py-2">{account.name}</td>
                  <td className="px-3 py-2 text-right">{(account.openingBalanceDebit || 0) > 0 ? `$${(account.openingBalanceDebit || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right">{(account.openingBalanceCredit || 0) > 0 ? `$${(account.openingBalanceCredit || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right">{(account.periodDebits || 0) > 0 ? `$${(account.periodDebits || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right">{(account.periodCredits || 0) > 0 ? `$${(account.periodCredits || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold">{(account.closingBalanceDebit || 0) > 0 ? `$${(account.closingBalanceDebit || 0).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold">{(account.closingBalanceCredit || 0) > 0 ? `$${(account.closingBalanceCredit || 0).toFixed(2)}` : '-'}</td>
                </tr>
              ))
            )}
            <tr className="bg-blue-50 font-bold">
              <td colSpan={2} className="px-3 py-2">TOTALES</td>
              <td className="px-3 py-2 text-right">${(data.totals?.openingBalanceDebits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.openingBalanceCredits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.periodDebits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.periodCredits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.closingBalanceDebits || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">${(data.totals?.closingBalanceCredits || 0).toFixed(2)}</td>
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
        <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
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
                <p className="font-semibold">Asiento #{entry.entryNumber} (Correlativo: {entry.correlativeNumber})</p>
                <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">{entry.description}</p>
                {entry.reference && <p className="text-xs text-gray-500">Ref: {entry.reference}</p>}
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs ${
                  entry.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {entry.status}
                </span>
                {entry.approvedBy && (
                  <p className="text-xs text-gray-500 mt-1">Por: {entry.approvedBy}</p>
                )}
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(entry.lines) && entry.lines.map((line: any, lineIdx: number) => (
                  <tr key={lineIdx}>
                    <td className="px-3 py-2">{line.lineNumber}</td>
                    <td className="px-3 py-2">{line.accountCode}</td>
                    <td className="px-3 py-2">{line.accountName}</td>
                    <td className="px-3 py-2 text-right">{(line.debit || 0) > 0 ? `$${(line.debit || 0).toFixed(2)}` : '-'}</td>
                    <td className="px-3 py-2 text-right">{(line.credit || 0) > 0 ? `$${(line.credit || 0).toFixed(2)}` : '-'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-right">Total asiento:</td>
                  <td className="px-3 py-2 text-right">${(entry.totalDebits || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${(entry.totalCredits || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {entry.isBalanced ? (
              <p className="text-xs text-green-600 mt-2">✓ Asiento balanceado</p>
            ) : (
              <p className="text-xs text-red-600 mt-2">✗ Asiento desbalanceado</p>
            )}
          </div>
        ))
        )}
      </div>
    </div>
  );

  const renderCheckSearch = (data: any) => (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <h3 className="text-2xl font-bold">Búsqueda por Número de Cheque</h3>
        <p className="text-gray-600">Cheque #{checkNumber}</p>
      </div>

      {Array.isArray(data.payrolls) && data.payrolls.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Nómina</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(data.payrolls) && data.payrolls.map((payroll: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{new Date(payroll.payDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm">{payroll.employeeName}</td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">${(payroll.netPay || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">{new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Array.isArray(data.journalEntries) && data.journalEntries.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Asientos de Diario</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asiento</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(data.journalEntries) && data.journalEntries.map((entry: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm">{entry.entryNumber}</td>
                    <td className="px-4 py-2 text-sm">{entry.description}</td>
                    <td className="px-4 py-2 text-sm">{entry.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!Array.isArray(data.payrolls) || data.payrolls.length === 0) && (!Array.isArray(data.journalEntries) || data.journalEntries.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron registros con el cheque #{checkNumber}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes Avanzados</h1>
          <p className="text-gray-600">Mayor analítico, balance de comprobación, libro diario legal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { value: 'trial-balance', label: 'Balance de Comprobación', icon: '📊' },
            { value: 'analytical-ledger', label: 'Mayor Analítico', icon: '📖' },
            { value: 'legal-journal', label: 'Libro Diario Legal', icon: '📝' },
            { value: 'check-search', label: 'Búsqueda de Cheque', icon: '🔍' },
          ].map((type) => (
            <Card
              key={type.value}
              className={`p-4 cursor-pointer transition-all ${
                reportType === type.value ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
              }`}
              onClick={() => setReportType(type.value as any)}
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <h3 className="font-semibold">{type.label}</h3>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Parámetros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {reportType !== 'check-search' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha inicio</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha fin</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
            
            {reportType === 'analytical-ledger' && (
              <div>
                <label className="block text-sm font-medium mb-1">Cuenta <span className="text-red-500">*</span></label>
                <select 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'check-search' && (
              <div>
                <label className="block text-sm font-medium mb-1">Número de Cheque</label>
                <Input placeholder="ej: 1001" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} />
              </div>
            )}
          </div>
          
          <Button onClick={generateReport} disabled={loading}>
            {loading ? 'Generando...' : 'Generar Reporte'}
          </Button>
        </Card>

        {reportData && (
          <Card className="p-6">
            {reportType === 'analytical-ledger' && renderAnalyticalLedger(reportData)}
            {reportType === 'trial-balance' && renderTrialBalance(reportData)}
            {reportType === 'legal-journal' && renderLegalJournal(reportData)}
            {reportType === 'check-search' && renderCheckSearch(reportData)}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
