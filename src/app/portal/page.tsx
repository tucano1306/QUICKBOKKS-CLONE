'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function getInvoiceStatusColor(status: string): string {
  if (status === 'PAID') return 'bg-green-500'
  if (status === 'OVERDUE') return 'bg-red-500'
  return 'bg-orange-500'
}

function getDocumentIcon(type: string | undefined | null): string {
  if (!type) return '📎'
  if (type.includes('pdf')) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('word')) return '📝'
  return '📎'
}

export default function ClientPortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'invoices' | 'documents'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Credenciales inválidas');
      }

      const data = await response.json();
      setCustomerId(data.user.customerId);
      setIsLoggedIn(true);
      setCurrentView('dashboard');
      await loadDashboard(data.user.customerId);
    } catch (error: any) {
      alert(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      console.error('Error login:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (custId: string) => {
    try {
      const response = await fetch(`/api/client-portal/dashboard?customerId=${custId}&type=stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await fetch(`/api/client-portal/dashboard?customerId=${customerId}&type=invoices`);
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setInvoices([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/client-portal/documents?customerId=${customerId}`);
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      setDocuments([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn && currentView === 'invoices' && invoices.length === 0) {
      loadInvoices();
    }
    if (isLoggedIn && currentView === 'documents' && documents.length === 0) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Portal de Clientes</h1>
            <p className="text-gray-600 mt-2">Accede a tus facturas y documentos</p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-semibold mb-2">🔐 Credenciales de prueba:</p>
            <p className="text-xs text-blue-700"><strong>Email:</strong> juan.perez@email.com</p>
            <p className="text-xs text-blue-700"><strong>Contraseña:</strong> client123</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email-input" className="block text-sm font-medium mb-2">Email</label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            ¿Olvidaste tu contraseña?{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Recuperar
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Mobile Breadcrumbs */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          {/* Mobile Breadcrumbs */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <span>🏠</span>
              <span>Portal</span>
            </button>
            {currentView !== 'dashboard' && (
              <>
                <span className="text-gray-400">›</span>
                <span className="text-sm text-gray-700">
                  {currentView === 'invoices' ? 'Facturas' : currentView === 'documents' ? 'Documentos' : ''}
                </span>
              </>
            )}
          </div>
          
          {/* Desktop Title */}
          <h1 className="hidden sm:block text-lg sm:text-2xl font-bold text-gray-900">Portal de Clientes</h1>
          
          <Button variant="outline" size="sm" onClick={() => setIsLoggedIn(false)}>
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant={currentView === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setCurrentView('dashboard')}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <span className="sm:hidden">📊</span>
            <span className="hidden sm:inline">📊 Dashboard</span>
          </Button>
          <Button
            variant={currentView === 'invoices' ? 'default' : 'outline'}
            onClick={() => setCurrentView('invoices')}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <span className="sm:hidden">📄</span>
            <span className="hidden sm:inline">📄 Facturas</span>
          </Button>
          <Button
            variant={currentView === 'documents' ? 'default' : 'outline'}
            onClick={() => setCurrentView('documents')}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <span className="sm:hidden">📁</span>
            <span className="hidden sm:inline">📁 Documentos</span>
          </Button>
        </div>

        {/* Dashboard View */}
        {currentView === 'dashboard' && stats && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Resumen de Cuenta</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              <Card className="p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Total Facturas</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.totalInvoices}</p>
              </Card>

              <Card className="p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Pagadas</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{stats.paidInvoices}</p>
              </Card>

              <Card className="p-3 sm:p-6 col-span-2 lg:col-span-1">
                <p className="text-xs sm:text-sm text-gray-600">Balance</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">
                  ${(stats.currentBalance || 0).toFixed(2)}
                </p>
              </Card>

              <Card className="p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1 sm:mt-2">{stats.pendingInvoices}</p>
              </Card>

              <Card className="p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Vencidas</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">{stats.overdueInvoices}</p>
              </Card>

              <Card className="p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Documentos</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.documentsCount}</p>
              </Card>
            </div>
          </div>
        )}

        {/* Invoices View */}
        {currentView === 'invoices' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Mis Facturas</h2>
            <div className="space-y-3 sm:space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">Factura #{invoice.invoiceNumber}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Fecha: {new Date(invoice.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Vencimiento: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="sm:text-right flex sm:block items-center justify-between">
                      <Badge
                        className={getInvoiceStatusColor(invoice.status)}
                      >
                        {invoice.status}
                      </Badge>
                      <div className="sm:mt-2">
                        <p className="text-xl sm:text-2xl font-bold">${(invoice.total || 0).toFixed(2)}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Balance: ${(invoice.balance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Items:</h4>
                    {invoice.items.map((item: any) => (
                      <div key={`${invoice.id}-${item.description}`} className="flex justify-between text-xs sm:text-sm py-1">
                        <span className="truncate mr-2">
                          {item.description} (x{item.quantity || 0})
                        </span>
                        <span className="flex-shrink-0">${(item.total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {invoice.balance > 0 && (
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2">
                      <Button size="sm" className="w-full sm:w-auto">💳 Pagar</Button>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">📥 PDF</Button>
                    </div>
                  )}
                </Card>
              ))}

              {invoices.length === 0 && (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  No tienes facturas disponibles
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents View */}
        {currentView === 'documents' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Mis Documentos</h2>
              <Button size="sm" className="w-full sm:w-auto">📤 Subir</Button>
            </div>

            {documents.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
                <div className="text-5xl sm:text-6xl mb-4">📁</div>
                <p className="text-gray-600">No hay documentos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl sm:text-4xl">
                        {getDocumentIcon(doc.type)}
                      </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{doc.name}</h3>
                      <p className="text-xs text-gray-600">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {((doc.size || 0) / 1024).toFixed(1)} KB
                      </p>
                      {doc.category && (
                        <Badge className="mt-2 text-xs">
                          {doc.category} {doc.autoCategorizationConfidence != null && `(${(doc.autoCategorizationConfidence * 100).toFixed(0)}%)`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Descargar
                    </Button>
                  </div>
                </Card>
              ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
