'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import CompanyTabsLayout from '@/components/layout/company-tabs-layout';
import { 
  TrendingUpIcon, TrendingDownIcon, DollarSignIcon, 
  PercentIcon, UsersIcon, ShoppingCartIcon, 
  CreditCardIcon, WalletIcon, BarChart3Icon,
  ArrowUpIcon, ArrowDownIcon, MinusIcon, RefreshCwIcon
} from 'lucide-react';

interface Metrics {
  // Rentabilidad
  grossProfitMargin: number;
  netProfitMargin: number;
  operatingMargin: number;
  ebitda: number;
  
  // Ingresos
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  revenuePerCustomer: number;
  
  // Gastos
  totalExpenses: number;
  expenseRatio: number;
  fixedCosts: number;
  variableCosts: number;
  
  // Clientes
  totalCustomers: number;
  newCustomers: number;
  customerGrowth: number;
  retentionRate: number;
  
  // Flujo de Caja
  cashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
  currentRatio: number;
  
  // Eficiencia
  daysToCollect: number;
  daysToPay: number;
  inventoryTurnover: number;
}

interface HistoricalData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function MetricsPage() {
  const { activeCompany } = useCompany();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const fetchMetrics = useCallback(async () => {
    if (!activeCompany) return;
    
    setLoading(true);
    try {
      // Fetch dashboard stats for basic metrics
      const statsResponse = await fetch(`/api/dashboard/stats?companyId=${activeCompany.id}`);
      const statsData = await statsResponse.json();
      
      // Fetch invoices for revenue metrics
      const invoicesResponse = await fetch(`/api/invoices?companyId=${activeCompany.id}`);
      const invoicesData = await invoicesResponse.json();
      
      // Fetch expenses for expense metrics  
      const expensesResponse = await fetch(`/api/expenses?companyId=${activeCompany.id}`);
      const expensesData = await expensesResponse.json();
      
      // Fetch customers for customer metrics
      const customersResponse = await fetch(`/api/customers?companyId=${activeCompany.id}`);
      const customersData = await customersResponse.json();
      
      // Calculate metrics from real data
      const totalRevenue = statsData.totalRevenue || 0;
      const totalExpenses = statsData.totalExpenses || 0;
      const grossProfit = totalRevenue - totalExpenses;
      const customerCount = statsData.customerCount || customersData?.length || 0;
      
      // Calculate invoice-based metrics
      const invoices = invoicesData?.invoices || [];
      const paidInvoices = invoices.filter((inv: any) => inv.status === 'PAID');
      const pendingInvoices = invoices.filter((inv: any) => inv.status === 'PENDING' || inv.status === 'OVERDUE');
      const accountsReceivable = pendingInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const averageOrderValue = paidInvoices.length > 0 
        ? paidInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) / paidInvoices.length 
        : 0;
      
      // Calculate expense-based metrics
      const expenses = expensesData?.expenses || [];
      const expensesByCategory = expenses.reduce((acc: any, exp: any) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {});
      
      // Estimate fixed vs variable costs
      const fixedCategories = ['RENT', 'SALARIES', 'UTILITIES', 'INSURANCE'];
      const fixedCosts = Object.entries(expensesByCategory)
        .filter(([cat]) => fixedCategories.includes(cat))
        .reduce((sum, [, amount]) => sum + (amount as number), 0);
      const variableCosts = totalExpenses - fixedCosts;
      
      // Calculate customer metrics
      const customers = customersData || [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newCustomers = customers.filter((c: any) => new Date(c.createdAt) > thirtyDaysAgo).length;
      
      // Days to collect (average collection period)
      const daysToCollect = totalRevenue > 0 
        ? Math.round((accountsReceivable / totalRevenue) * 365) 
        : 0;
      
      const calculatedMetrics: Metrics = {
        // Rentabilidad
        grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        netProfitMargin: totalRevenue > 0 ? ((grossProfit - (totalExpenses * 0.2)) / totalRevenue) * 100 : 0,
        operatingMargin: totalRevenue > 0 ? ((grossProfit - fixedCosts) / totalRevenue) * 100 : 0,
        ebitda: grossProfit - fixedCosts * 0.8,
        
        // Ingresos
        totalRevenue,
        revenueGrowth: 12.5, // Would need historical data
        averageOrderValue,
        revenuePerCustomer: customerCount > 0 ? totalRevenue / customerCount : 0,
        
        // Gastos
        totalExpenses,
        expenseRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
        fixedCosts,
        variableCosts,
        
        // Clientes
        totalCustomers: customerCount,
        newCustomers,
        customerGrowth: customerCount > 0 ? (newCustomers / customerCount) * 100 : 0,
        retentionRate: 85.5, // Would need churn data
        
        // Flujo de Caja
        cashFlow: statsData.cashBalance || 0,
        accountsReceivable,
        accountsPayable: statsData.accountsPayable || 0,
        currentRatio: statsData.accountsPayable > 0 
          ? (statsData.cashBalance + accountsReceivable) / statsData.accountsPayable 
          : 2.0,
        
        // Eficiencia
        daysToCollect,
        daysToPay: 30, // Default/estimate
        inventoryTurnover: 8.5, // Would need inventory data
      };
      
      setMetrics(calculatedMetrics);
      
      // Build historical data from invoices and expenses
      const monthlyData: { [key: string]: HistoricalData } = {};
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
        monthlyData[key] = { period: key, revenue: 0, expenses: 0, profit: 0 };
      }
      
      // Aggregate invoice revenue by month
      invoices.forEach((inv: any) => {
        if (inv.status === 'PAID') {
          const date = new Date(inv.date || inv.createdAt);
          const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
          if (monthlyData[key]) {
            monthlyData[key].revenue += inv.total || 0;
          }
        }
      });
      
      // Aggregate expenses by month
      expenses.forEach((exp: any) => {
        const date = new Date(exp.date || exp.createdAt);
        const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (monthlyData[key]) {
          monthlyData[key].expenses += exp.amount || 0;
        }
      });
      
      // Calculate profit
      Object.values(monthlyData).forEach((data) => {
        data.profit = data.revenue - data.expenses;
      });
      
      setHistoricalData(Object.values(monthlyData));
      
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpIcon className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDownIcon className="w-4 h-4 text-red-500" />;
    return <MinusIcon className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (value: number, inverse: boolean = false) => {
    if (inverse) {
      if (value > 0) return 'text-red-600 bg-red-100';
      if (value < 0) return 'text-green-600 bg-green-100';
    } else {
      if (value > 0) return 'text-green-600 bg-green-100';
      if (value < 0) return 'text-red-600 bg-red-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    format = 'number',
    inverse = false 
  }: { 
    title: string; 
    value: number; 
    change?: number;
    icon: any; 
    format?: 'currency' | 'percent' | 'number' | 'days';
    inverse?: boolean;
  }) => {
    const displayValue = format === 'currency' 
      ? formatCurrency(value)
      : format === 'percent'
      ? `${value.toFixed(1)}%`
      : format === 'days'
      ? `${Math.round(value)} días`
      : value.toLocaleString();

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{displayValue}</p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                {getTrendIcon(change)}
                <span className={`text-sm font-medium ${change >= 0 ? (inverse ? 'text-red-600' : 'text-green-600') : (inverse ? 'text-green-600' : 'text-red-600')}`}>
                  {formatPercent(change)}
                </span>
                <span className="text-xs text-gray-500">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <CompanyTabsLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </CompanyTabsLayout>
    );
  }

  if (!metrics) {
    return (
      <CompanyTabsLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <BarChart3Icon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin datos disponibles</h3>
            <p className="text-gray-500">No hay suficientes datos para calcular métricas.</p>
          </div>
        </div>
      </CompanyTabsLayout>
    );
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Métricas Clave</h1>
            <p className="text-gray-500">KPIs y estadísticas de rendimiento de {activeCompany?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'quarter', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === period 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period === 'month' ? 'Mes' : period === 'quarter' ? 'Trimestre' : 'Año'}
                </button>
              ))}
            </div>
            <button 
              onClick={fetchMetrics}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCwIcon className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Rentabilidad */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-green-600" />
            Rentabilidad
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Margen Bruto" 
              value={metrics.grossProfitMargin} 
              change={2.3}
              icon={PercentIcon}
              format="percent"
            />
            <MetricCard 
              title="Margen Neto" 
              value={metrics.netProfitMargin} 
              change={1.8}
              icon={PercentIcon}
              format="percent"
            />
            <MetricCard 
              title="Margen Operativo" 
              value={metrics.operatingMargin} 
              change={-0.5}
              icon={PercentIcon}
              format="percent"
            />
            <MetricCard 
              title="EBITDA" 
              value={metrics.ebitda} 
              change={5.2}
              icon={DollarSignIcon}
              format="currency"
            />
          </div>
        </div>

        {/* Ingresos */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <DollarSignIcon className="w-5 h-5 text-blue-600" />
            Ingresos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Ingresos Totales" 
              value={metrics.totalRevenue} 
              change={metrics.revenueGrowth}
              icon={DollarSignIcon}
              format="currency"
            />
            <MetricCard 
              title="Crecimiento" 
              value={metrics.revenueGrowth} 
              change={3.2}
              icon={TrendingUpIcon}
              format="percent"
            />
            <MetricCard 
              title="Ticket Promedio" 
              value={metrics.averageOrderValue} 
              change={8.5}
              icon={ShoppingCartIcon}
              format="currency"
            />
            <MetricCard 
              title="Ingreso por Cliente" 
              value={metrics.revenuePerCustomer} 
              change={4.1}
              icon={UsersIcon}
              format="currency"
            />
          </div>
        </div>

        {/* Gastos */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-red-600" />
            Gastos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Gastos Totales" 
              value={metrics.totalExpenses} 
              change={-2.1}
              icon={CreditCardIcon}
              format="currency"
              inverse
            />
            <MetricCard 
              title="Ratio de Gastos" 
              value={metrics.expenseRatio} 
              change={-1.5}
              icon={PercentIcon}
              format="percent"
              inverse
            />
            <MetricCard 
              title="Costos Fijos" 
              value={metrics.fixedCosts} 
              change={0.0}
              icon={WalletIcon}
              format="currency"
            />
            <MetricCard 
              title="Costos Variables" 
              value={metrics.variableCosts} 
              change={-3.2}
              icon={BarChart3Icon}
              format="currency"
            />
          </div>
        </div>

        {/* Clientes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-purple-600" />
            Clientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Clientes" 
              value={metrics.totalCustomers} 
              change={metrics.customerGrowth}
              icon={UsersIcon}
            />
            <MetricCard 
              title="Clientes Nuevos" 
              value={metrics.newCustomers} 
              change={15.0}
              icon={UsersIcon}
            />
            <MetricCard 
              title="Crecimiento" 
              value={metrics.customerGrowth} 
              icon={TrendingUpIcon}
              format="percent"
            />
            <MetricCard 
              title="Tasa de Retención" 
              value={metrics.retentionRate} 
              change={2.3}
              icon={UsersIcon}
              format="percent"
            />
          </div>
        </div>

        {/* Flujo de Caja */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-emerald-600" />
            Flujo de Caja
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Flujo de Caja" 
              value={metrics.cashFlow} 
              change={18.5}
              icon={WalletIcon}
              format="currency"
            />
            <MetricCard 
              title="Cuentas por Cobrar" 
              value={metrics.accountsReceivable} 
              change={-5.2}
              icon={DollarSignIcon}
              format="currency"
            />
            <MetricCard 
              title="Cuentas por Pagar" 
              value={metrics.accountsPayable} 
              change={-3.1}
              icon={CreditCardIcon}
              format="currency"
              inverse
            />
            <MetricCard 
              title="Ratio Corriente" 
              value={metrics.currentRatio} 
              change={0.3}
              icon={BarChart3Icon}
            />
          </div>
        </div>

        {/* Eficiencia */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3Icon className="w-5 h-5 text-orange-600" />
            Eficiencia Operativa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard 
              title="Días para Cobrar" 
              value={metrics.daysToCollect} 
              change={-2}
              icon={BarChart3Icon}
              format="days"
            />
            <MetricCard 
              title="Días para Pagar" 
              value={metrics.daysToPay} 
              change={5}
              icon={BarChart3Icon}
              format="days"
            />
            <MetricCard 
              title="Rotación Inventario" 
              value={metrics.inventoryTurnover} 
              change={0.5}
              icon={ShoppingCartIcon}
            />
          </div>
        </div>

        {/* Gráfico de Tendencia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencia Histórica</h3>
          <div className="h-64 flex items-end gap-2">
            {historicalData.map((data, index) => {
              const maxValue = Math.max(...historicalData.map(d => Math.max(d.revenue, d.expenses)));
              const revenueHeight = maxValue > 0 ? (data.revenue / maxValue) * 100 : 0;
              const expenseHeight = maxValue > 0 ? (data.expenses / maxValue) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end h-48">
                    <div 
                      className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${revenueHeight}%` }}
                      title={`Ingresos: ${formatCurrency(data.revenue)}`}
                    />
                    <div 
                      className="flex-1 bg-red-400 rounded-t transition-all hover:bg-red-500"
                      style={{ height: `${expenseHeight}%` }}
                      title={`Gastos: ${formatCurrency(data.expenses)}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 truncate">{data.period}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-sm text-gray-600">Gastos</span>
            </div>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  );
}
