'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  ChevronRight,
  Plus,
  Settings,
  BarChart3,
  Bell
} from 'lucide-react';
import Link from 'next/link';

interface FirmDashboardData {
  firmId: string;
  firmName: string;
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  pendingBillableHours: number;
  unbilledAmount: number;
  upcomingDeadlines: DeadlineInfo[];
  clientAlerts: AlertInfo[];
  staffUtilization: StaffUtilization[];
  revenueByClient: ClientRevenue[];
  engagementSummary: EngagementSummary;
}

interface DeadlineInfo {
  id: string;
  type: string;
  clientCode: string;
  companyName: string;
  description: string;
  deadline: string;
  daysRemaining: number;
  priority: string;
  status: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE';
}

interface AlertInfo {
  id: string;
  clientCode: string;
  companyName: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  createdAt: string;
}

interface StaffUtilization {
  staffId: string;
  staffName: string;
  role: string;
  totalHours: number;
  billableHours: number;
  utilizationRate: number;
}

interface ClientRevenue {
  clientId: string;
  clientCode: string;
  companyName: string;
  monthlyFee: number;
  totalBilled: number;
}

interface EngagementSummary {
  active: number;
  completed: number;
  overdue: number;
  totalBudget: number;
  totalBilled: number;
}

export default function FirmDashboardPage() {
  const { data: session, status } = useSession();
  const [dashboard, setDashboard] = useState<FirmDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboard();
    }
  }, [status]);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/firm/dashboard?view=dashboard');
      const data = await res.json();
      
      if (data.needsSetup) {
        setNeedsSetup(true);
      } else if (data.error) {
        setError(data.error);
      } else {
        setDashboard(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Configura tu Firma Contable
          </h1>
          <p className="text-gray-600 mb-6">
            Aún no has creado una firma contable. Crea una para gestionar múltiples clientes.
          </p>
          <Link
            href="/firm/setup"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Firma Contable
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dashboard.firmName}</h1>
            <p className="text-gray-600 mt-1">Dashboard de Firma Contable</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/firm/clients"
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              <Users className="w-4 h-4" />
              Clientes
            </Link>
            <Link
              href="/firm/time"
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              <Clock className="w-4 h-4" />
              Tiempo
            </Link>
            <Link
              href="/firm/settings"
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              Configuración
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clientes Activos</p>
              <p className="text-3xl font-bold text-gray-900">{dashboard.activeClients}</p>
              <p className="text-xs text-gray-400 mt-1">de {dashboard.totalClients} total</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Mensuales</p>
              <p className="text-3xl font-bold text-gray-900">
                ${dashboard.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">fees fijos</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Horas No Facturadas</p>
              <p className="text-3xl font-bold text-gray-900">
                {dashboard.pendingBillableHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ${dashboard.unbilledAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Engagements Activos</p>
              <p className="text-3xl font-bold text-gray-900">{dashboard.engagementSummary.active}</p>
              <p className="text-xs text-red-500 mt-1">
                {dashboard.engagementSummary.overdue} vencidos
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500" />
                Alertas
              </h2>
              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                {dashboard.clientAlerts.length}
              </span>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {dashboard.clientAlerts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Sin alertas pendientes
                </div>
              ) : (
                dashboard.clientAlerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        alert.severity === 'CRITICAL' ? 'bg-red-100' :
                        alert.severity === 'WARNING' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          alert.severity === 'CRITICAL' ? 'text-red-600' :
                          alert.severity === 'WARNING' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-xs text-gray-500 truncate">{alert.companyName}</p>
                        <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {dashboard.clientAlerts.length > 5 && (
              <div className="p-3 border-t">
                <Link 
                  href="/firm/alerts" 
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
                >
                  Ver todas ({dashboard.clientAlerts.length})
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Deadlines próximos */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Próximos Vencimientos
              </h2>
              <span className="text-xs text-gray-500">14 días</span>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {dashboard.upcomingDeadlines.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Sin vencimientos próximos
                </div>
              ) : (
                dashboard.upcomingDeadlines.slice(0, 5).map(deadline => (
                  <div key={deadline.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {deadline.description}
                        </p>
                        <p className="text-xs text-gray-500">{deadline.companyName}</p>
                      </div>
                      <div className={`text-right ${
                        deadline.status === 'OVERDUE' ? 'text-red-600' :
                        deadline.status === 'DUE_TODAY' ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        <p className="text-sm font-medium">
                          {deadline.status === 'OVERDUE' ? 'Vencido' :
                           deadline.status === 'DUE_TODAY' ? 'Hoy' :
                           `${deadline.daysRemaining}d`}
                        </p>
                        <p className="text-xs">
                          {new Date(deadline.deadline).toLocaleDateString('es-ES', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {dashboard.upcomingDeadlines.length > 5 && (
              <div className="p-3 border-t">
                <Link 
                  href="/firm/calendar" 
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
                >
                  Ver calendario completo
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Utilización del Staff */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Utilización del Equipo
              </h2>
              <span className="text-xs text-gray-500">Este mes</span>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {dashboard.staffUtilization.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Sin datos de utilización
                </div>
              ) : (
                dashboard.staffUtilization.map(staff => (
                  <div key={staff.staffId} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{staff.staffName}</p>
                        <p className="text-xs text-gray-500">{staff.role}</p>
                      </div>
                      <span className={`text-sm font-medium ${
                        staff.utilizationRate >= 80 ? 'text-green-600' :
                        staff.utilizationRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {staff.utilizationRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          staff.utilizationRate >= 80 ? 'bg-green-500' :
                          staff.utilizationRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(staff.utilizationRate, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {staff.billableHours.toFixed(1)}h facturables de {staff.totalHours.toFixed(1)}h
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t">
              <Link 
                href="/firm/reports/utilization" 
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
              >
                Ver reporte completo
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Clientes Top */}
      <div className="mt-6">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Clientes por Ingresos
            </h2>
            <Link
              href="/firm/clients"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Mensual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Facturado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboard.revenueByClient.slice(0, 5).map(client => (
                  <tr key={client.clientId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.companyName}</p>
                        <p className="text-xs text-gray-500">{client.clientCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm text-gray-900">
                        ${client.monthlyFee.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm text-gray-900">
                        ${client.totalBilled.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/firm/clients/${client.clientId}`}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
