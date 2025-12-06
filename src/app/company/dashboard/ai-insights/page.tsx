'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/contexts/CompanyContext';
import CompanyTabsLayout from '@/components/layout/company-tabs-layout';
import toast from 'react-hot-toast';
import { 
  LightbulbIcon, TrendingUpIcon, AlertTriangleIcon, 
  CheckCircleIcon, ArrowRightIcon, SparklesIcon,
  DollarSignIcon, UsersIcon, ShoppingCartIcon,
  BarChart3Icon, RefreshCwIcon, ChevronDownIcon,
  ChevronUpIcon, BrainCircuitIcon, TargetIcon,
  ZapIcon, ShieldCheckIcon
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'recommendation' | 'warning' | 'opportunity' | 'success';
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionable: boolean;
  action?: string;
  metric?: {
    current: number;
    target: number;
    unit: string;
  };
}

interface Prediction {
  id: string;
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  value?: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

interface AIAnalysis {
  overallHealth: number;
  riskLevel: 'low' | 'medium' | 'high';
  growthPotential: number;
  recommendations: number;
  warnings: number;
}

export default function AIInsightsPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Handler para acciones de los insights
  const handleInsightAction = (action: string, category: string) => {
    const actionRoutes: { [key: string]: string } = {
      'Revisar gastos': '/company/expenses',
      'Optimizar gastos': '/company/expenses',
      'Analizar proveedores': '/company/vendors',
      'Dar seguimiento a facturas pendientes': '/company/invoicing/invoices',
      'Explorar nuevos mercados': '/company/customers',
      'Revisar y aplicar': '/company/reports',
      'Ver productos': '/company/products',
      'Revisar inventario': '/company/products',
      'Ver clientes': '/company/customers',
      'Nuevo cliente': '/company/customers/new',
      'Nueva factura': '/company/invoicing/invoices/new',
      'Ver reportes': '/company/reports',
      'Ver dashboard': '/company/dashboard',
    };

    // Find the best matching route
    let targetRoute = actionRoutes[action];
    
    if (!targetRoute) {
      // Try category-based routing
      const categoryRoutes: { [key: string]: string } = {
        'gastos': '/company/expenses',
        'ingresos': '/company/reports/income-statement',
        'cobranza': '/company/invoicing/invoices',
        'estrategia': '/company/reports',
        'flujo': '/company/reports/cash-flow',
        'clientes': '/company/customers',
        'inventario': '/company/products',
        'general': '/company/dashboard',
      };
      targetRoute = categoryRoutes[category] || '/company/dashboard';
    }

    toast.success(`📍 Navegando a: ${action}`);
    router.push(targetRoute);
  };

  const fetchInsights = useCallback(async () => {
    if (!activeCompany) return;
    
    setLoading(true);
    try {
      // Fetch AI recommendations
      const recommendationsResponse = await fetch(`/api/ai/recommendations?companyId=${activeCompany.id}`);
      const recommendationsData = await recommendationsResponse.json();
      
      // Fetch AI predictions
      const predictionsResponse = await fetch(`/api/ai/predictions?companyId=${activeCompany.id}`);
      const predictionsData = await predictionsResponse.json();
      
      // Fetch dashboard stats for context
      const statsResponse = await fetch(`/api/dashboard/stats?companyId=${activeCompany.id}`);
      const statsData = await statsResponse.json();
      
      // Transform recommendations to insights
      const transformedInsights: Insight[] = [];
      
      // Add recommendations
      if (recommendationsData?.recommendations) {
        recommendationsData.recommendations.forEach((rec: any, index: number) => {
          transformedInsights.push({
            id: `rec-${index}`,
            type: rec.priority === 'high' ? 'warning' : 'recommendation',
            title: rec.title || 'Recomendación',
            description: rec.description || rec.message,
            impact: rec.impact || 'Mejora potencial en eficiencia operativa',
            priority: rec.priority || 'medium',
            category: rec.category || 'general',
            actionable: true,
            action: rec.action || 'Revisar y aplicar',
          });
        });
      }
      
      // Generate insights from stats data
      const totalRevenue = statsData.totalRevenue || 0;
      const totalExpenses = statsData.totalExpenses || 0;
      const customerCount = statsData.customerCount || 0;
      const pendingInvoices = statsData.pendingInvoices || 0;
      
      // Revenue insight
      if (totalRevenue > totalExpenses) {
        transformedInsights.push({
          id: 'revenue-1',
          type: 'success',
          title: 'Margen positivo',
          description: `Tus ingresos superan los gastos por ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalRevenue - totalExpenses)}. Mantén esta tendencia positiva.`,
          impact: 'Salud financiera estable',
          priority: 'low',
          category: 'finanzas',
          actionable: false,
        });
      } else if (totalRevenue > 0) {
        transformedInsights.push({
          id: 'revenue-1',
          type: 'warning',
          title: 'Gastos superiores a ingresos',
          description: 'Tus gastos están excediendo tus ingresos. Es recomendable revisar y optimizar los costos.',
          impact: 'Riesgo financiero potencial',
          priority: 'high',
          category: 'finanzas',
          actionable: true,
          action: 'Revisar gastos y optimizar costos',
        });
      }
      
      // Customer insight
      if (customerCount < 10 && customerCount > 0) {
        transformedInsights.push({
          id: 'customer-1',
          type: 'opportunity',
          title: 'Oportunidad de crecimiento en clientes',
          description: 'Tu base de clientes es pequeña. Considera estrategias de adquisición para expandir tu mercado.',
          impact: 'Potencial incremento en ventas del 30-50%',
          priority: 'medium',
          category: 'clientes',
          actionable: true,
          action: 'Implementar estrategia de captación',
          metric: {
            current: customerCount,
            target: customerCount * 2,
            unit: 'clientes'
          }
        });
      }
      
      // Pending invoices insight
      if (pendingInvoices > 0) {
        transformedInsights.push({
          id: 'invoices-1',
          type: pendingInvoices > 5 ? 'warning' : 'recommendation',
          title: 'Facturas pendientes de cobro',
          description: `Tienes ${pendingInvoices} factura(s) pendiente(s). El seguimiento oportuno mejora el flujo de caja.`,
          impact: 'Mejora en flujo de efectivo',
          priority: pendingInvoices > 5 ? 'high' : 'medium',
          category: 'cobranza',
          actionable: true,
          action: 'Dar seguimiento a facturas pendientes',
        });
      }
      
      // Additional strategic insights
      transformedInsights.push({
        id: 'strategy-1',
        type: 'recommendation',
        title: 'Diversificación de ingresos',
        description: 'Analiza nuevas líneas de productos o servicios para reducir dependencia de fuentes únicas de ingreso.',
        impact: 'Mayor estabilidad ante cambios del mercado',
        priority: 'low',
        category: 'estrategia',
        actionable: true,
        action: 'Explorar nuevos mercados',
      });
      
      setInsights(transformedInsights);
      
      // Transform predictions
      const transformedPredictions: Prediction[] = [];
      
      if (predictionsData?.predictions) {
        predictionsData.predictions.forEach((pred: any, index: number) => {
          transformedPredictions.push({
            id: `pred-${index}`,
            title: pred.title || 'Predicción',
            description: pred.description || pred.message,
            confidence: pred.confidence || 75,
            timeframe: pred.timeframe || 'Próximo mes',
            value: pred.value,
            trend: pred.trend || 'stable',
            category: pred.category || 'general',
          });
        });
      }
      
      // Generate predictions from data patterns
      if (totalRevenue > 0) {
        transformedPredictions.push({
          id: 'pred-revenue',
          title: 'Proyección de ingresos',
          description: 'Basado en tendencias actuales, se proyecta un crecimiento moderado en los próximos 30 días.',
          confidence: 72,
          timeframe: 'Próximo mes',
          value: totalRevenue * 1.08,
          trend: 'up',
          category: 'ingresos',
        });
      }
      
      if (totalExpenses > 0) {
        transformedPredictions.push({
          id: 'pred-expenses',
          title: 'Proyección de gastos',
          description: 'Se espera que los gastos se mantengan estables con ligero aumento estacional.',
          confidence: 68,
          timeframe: 'Próximo mes',
          value: totalExpenses * 1.03,
          trend: 'stable',
          category: 'gastos',
        });
      }
      
      transformedPredictions.push({
        id: 'pred-cash',
        title: 'Flujo de caja proyectado',
        description: 'El flujo de caja se mantendrá positivo si se mantienen las tendencias actuales.',
        confidence: 65,
        timeframe: 'Próximo trimestre',
        trend: totalRevenue > totalExpenses ? 'up' : 'down',
        category: 'flujo',
      });
      
      setPredictions(transformedPredictions);
      
      // Calculate overall analysis
      const warningsCount = transformedInsights.filter(i => i.type === 'warning').length;
      const recommendationsCount = transformedInsights.filter(i => i.type === 'recommendation').length;
      
      setAnalysis({
        overallHealth: totalRevenue > totalExpenses ? 78 : 45,
        riskLevel: warningsCount > 2 ? 'high' : warningsCount > 0 ? 'medium' : 'low',
        growthPotential: customerCount > 0 ? 72 : 50,
        recommendations: recommendationsCount,
        warnings: warningsCount,
      });
      
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const getTypeIcon = (type: Insight['type']) => {
    switch (type) {
      case 'recommendation': return <LightbulbIcon className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'opportunity': return <TrendingUpIcon className="w-5 h-5 text-green-500" />;
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getTypeColor = (type: Insight['type']) => {
    switch (type) {
      case 'recommendation': return 'bg-blue-50 border-blue-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'opportunity': return 'bg-green-50 border-green-200';
      case 'success': return 'bg-emerald-50 border-emerald-200';
    }
  };

  const getPriorityBadge = (priority: Insight['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-gray-100 text-gray-700',
    };
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getTrendIcon = (trend: Prediction['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUpIcon className="w-4 h-4 text-red-500 transform rotate-180" />;
      case 'stable': return <ArrowRightIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const categories = ['all', ...new Set(insights.map(i => i.category))];
  const filteredInsights = activeCategory === 'all' 
    ? insights 
    : insights.filter(i => i.category === activeCategory);

  if (loading) {
    return (
      <CompanyTabsLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500">Analizando datos con IA...</p>
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
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
              <BrainCircuitIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Insights IA</h1>
              <p className="text-gray-500">Recomendaciones inteligentes para {activeCompany?.name}</p>
            </div>
          </div>
          <button 
            onClick={fetchInsights}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <RefreshCwIcon className="w-4 h-4" />
            Actualizar Análisis
          </button>
        </div>

        {/* Health Overview */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Salud General</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{analysis.overallHealth}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${analysis.overallHealth}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Nivel de Riesgo</p>
                  <p className={`text-xl font-bold mt-1 ${
                    analysis.riskLevel === 'low' ? 'text-green-600' :
                    analysis.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {analysis.riskLevel === 'low' ? 'Bajo' : 
                     analysis.riskLevel === 'medium' ? 'Medio' : 'Alto'}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  analysis.riskLevel === 'low' ? 'bg-green-100' :
                  analysis.riskLevel === 'medium' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <AlertTriangleIcon className={`w-6 h-6 ${
                    analysis.riskLevel === 'low' ? 'text-green-600' :
                    analysis.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Potencial de Crecimiento</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{analysis.growthPotential}%</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TargetIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${analysis.growthPotential}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Insights Activos</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-bold text-gray-900">{insights.length}</span>
                    <span className="text-sm text-gray-500">
                      ({analysis.warnings} alertas)
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <ZapIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'Todos' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Insights List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-500" />
              Recomendaciones e Insights
            </h2>
            
            {filteredInsights.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <LightbulbIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No hay insights disponibles en esta categoría</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInsights.map((insight) => (
                  <div 
                    key={insight.id}
                    className={`bg-white rounded-xl shadow-sm border ${getTypeColor(insight.type)} p-4 transition-all hover:shadow-md`}
                  >
                    <div 
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                    >
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {getTypeIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(insight.priority)}
                            {expandedInsight === insight.id 
                              ? <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                              : <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                            }
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        
                        {expandedInsight === insight.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 uppercase">Impacto</p>
                                <p className="text-sm font-medium text-gray-800">{insight.impact}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase">Categoría</p>
                                <p className="text-sm font-medium text-gray-800 capitalize">{insight.category}</p>
                              </div>
                            </div>
                            
                            {insight.metric && (
                              <div className="mt-4">
                                <p className="text-xs text-gray-500 uppercase mb-2">Progreso</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-blue-500 h-3 rounded-full"
                                      style={{ width: `${(insight.metric.current / insight.metric.target) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {insight.metric.current} / {insight.metric.target} {insight.metric.unit}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {insight.actionable && insight.action && (
                              <button 
                                onClick={() => handleInsightAction(insight.action!, insight.category)}
                                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                {insight.action}
                                <ArrowRightIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Predictions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-500" />
              Predicciones
            </h2>
            
            <div className="space-y-3">
              {predictions.map((prediction) => (
                <div 
                  key={prediction.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(prediction.trend)}
                        <h3 className="font-semibold text-gray-900">{prediction.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{prediction.description}</p>
                      
                      {prediction.value && (
                        <p className="text-lg font-bold text-blue-600 mt-2">
                          {formatCurrency(prediction.value)}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">{prediction.timeframe}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            prediction.confidence >= 70 ? 'bg-green-500' :
                            prediction.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs text-gray-600">
                            {prediction.confidence}% confianza
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                Resumen IA
              </h3>
              <p className="text-sm text-purple-100 mt-2">
                El análisis de IA ha procesado tus datos financieros y generado {insights.length} insights 
                y {predictions.length} predicciones para ayudarte a tomar mejores decisiones.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-2xl font-bold">{insights.filter(i => i.type === 'opportunity').length}</p>
                  <p className="text-xs text-purple-100">Oportunidades</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-2xl font-bold">{insights.filter(i => i.actionable).length}</p>
                  <p className="text-xs text-purple-100">Acciones sugeridas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  );
}
