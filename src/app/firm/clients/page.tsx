'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Building,
  AlertCircle,
  Calendar,
  DollarSign,
  ChevronRight,
  MoreVertical,
  ArrowUpDown
} from 'lucide-react';

interface ClientOverview {
  id: string;
  clientCode: string;
  companyId: string;
  companyName: string;
  taxId: string | null;
  status: string;
  priority: string;
  primaryAccountant: string | null;
  healthScore: number | null;
  monthlyFee: number | null;
  pendingInvoices: number;
  pendingExpenses: number;
  totalRevenue: number;
  lastActivityDate: string | null;
  nextDeadline: string | null;
  alertCount: number;
}

export default function FirmClientsPage() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('companyName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchClients();
    }
  }, [status]);

  async function fetchClients() {
    try {
      const res = await fetch('/api/firm/dashboard?view=clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error('Error fetching clients:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = 
        client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal: any = a[sortField as keyof ClientOverview];
      let bVal: any = b[sortField as keyof ClientOverview];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      ONBOARDING: 'bg-blue-100 text-blue-700',
      ON_HOLD: 'bg-yellow-100 text-yellow-700',
      INACTIVE: 'bg-gray-100 text-gray-700',
      CHURNED: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      URGENT: 'bg-red-100 text-red-700',
      HIGH: 'bg-orange-100 text-orange-700',
      NORMAL: 'bg-gray-100 text-gray-600',
      LOW: 'bg-blue-100 text-blue-600'
    };
    return styles[priority] || 'bg-gray-100 text-gray-600';
  };

  const getHealthColor = (score: number | null) => {
    if (score === null) return 'bg-gray-200';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-1">
              {clients.length} clientes en total
            </p>
          </div>
          <Link
            href="/firm/clients/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Agregar Cliente
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="ONBOARDING">En proceso</option>
              <option value="ON_HOLD">En pausa</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contador
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('healthScore')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Salud
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('monthlyFee')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Fee Mensual
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alertas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Building className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No hay clientes</p>
                    <p className="text-sm">Agrega tu primer cliente para comenzar</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <Link 
                            href={`/firm/clients/${client.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {client.companyName}
                          </Link>
                          <p className="text-xs text-gray-500">{client.clientCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(client.status)}`}>
                          {client.status}
                        </span>
                        {client.priority !== 'NORMAL' && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(client.priority)}`}>
                            {client.priority}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {client.primaryAccountant || 'Sin asignar'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className="w-full max-w-[60px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                              {client.healthScore ?? '—'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getHealthColor(client.healthScore)}`}
                              style={{ width: `${client.healthScore || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${(client.monthlyFee || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${(client.totalRevenue || 0).toLocaleString()} total
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {client.alertCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <AlertCircle className="w-3 h-3" />
                            {client.alertCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/firm/clients/${client.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Ver
                        </Link>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-xl font-bold text-gray-900">
                {clients.filter(c => c.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En Proceso</p>
              <p className="text-xl font-bold text-gray-900">
                {clients.filter(c => c.status === 'ONBOARDING').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Con Alertas</p>
              <p className="text-xl font-bold text-gray-900">
                {clients.filter(c => c.alertCount > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos Mensuales</p>
              <p className="text-xl font-bold text-gray-900">
                ${clients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
