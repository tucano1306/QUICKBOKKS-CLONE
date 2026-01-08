'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, Activity, Workflow, Box, Zap } from 'lucide-react';

export default function DevOpsPublicPage() {
  const router = useRouter();

  const tools = [
    {
      name: 'Terminal',
      description: 'Consola de comandos interactiva',
      icon: Terminal,
      color: 'bg-green-500',
      tab: 'terminal'
    },
    {
      name: 'Jenkins',
      description: 'CI/CD Pipelines y automatización',
      icon: Workflow,
      color: 'bg-red-500',
      tab: 'jenkins'
    },
    {
      name: 'Puppet',
      description: 'Gestión de configuración',
      icon: Box,
      color: 'bg-orange-500',
      tab: 'puppet'
    },
    {
      name: 'Ansible',
      description: 'Automatización de infraestructura',
      icon: Zap,
      color: 'bg-red-600',
      tab: 'ansible'
    },
    {
      name: 'SonarQube',
      description: 'Análisis de calidad de código',
      icon: Shield,
      color: 'bg-blue-500',
      tab: 'sonarqube'
    },
    {
      name: 'Prometheus',
      description: 'Monitoreo y métricas en tiempo real',
      icon: Activity,
      color: 'bg-orange-600',
      tab: 'prometheus'
    }
  ];

  const handleToolClick = (tab: string) => {
    router.push(`/company/devops?tab=${tab}`);
  };

  const handleEnterDashboard = () => {
    router.push('/company/devops');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg">
                <Terminal className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">ComputoPlus DevOps</h1>
                <p className="text-gray-400 text-xs sm:text-sm">Centro de Control de Infraestructura</p>
              </div>
            </div>
            <button
              onClick={handleEnterDashboard}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-green-500/25 text-sm sm:text-base"
            >
              🚀 <span className="hidden sm:inline">Entrar al</span> Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            Herramientas <span className="text-green-400">DevOps</span> Integradas
          </h2>
          <p className="text-sm sm:text-xl text-gray-400 max-w-2xl mx-auto px-2">
            Gestiona tu infraestructura, pipelines CI/CD, configuración y monitoreo desde un solo lugar
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-16">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.name}
                onClick={() => handleToolClick(tool.tab)}
                className="group p-3 sm:p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-green-500/50 hover:bg-gray-800 transition-all duration-300 text-left"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4">
                  <div className={`p-2 sm:p-3 ${tool.color} rounded-lg group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-sm sm:text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-gray-400 mt-0.5 sm:mt-1 text-xs sm:text-base hidden sm:block">{tool.description}</p>
                  </div>
                </div>
                <div className="mt-2 sm:mt-4 flex items-center justify-center sm:justify-start text-green-400 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs sm:text-sm">Abrir →</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Access Section */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 sm:p-8">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">Acceso Rápido</h3>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-4">
            <a
              href="/company/devops"
              className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-base"
            >
              <Terminal className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Dashboard Completo</span>
              <span className="sm:hidden">Dashboard</span>
            </a>
            <a
              href="/company/devops?tab=jenkins"
              className="px-3 sm:px-6 py-2 sm:py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-base"
            >
              <Workflow className="h-4 w-4 sm:h-5 sm:w-5" />
              Jenkins
            </a>
            <a
              href="/company/devops?tab=ansible"
              className="px-3 sm:px-6 py-2 sm:py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-base"
            >
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              Ansible
            </a>
            <a
              href="/company/devops?tab=prometheus"
              className="px-3 sm:px-6 py-2 sm:py-3 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-600/50 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-base"
            >
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Métricas
            </a>
          </div>
        </div>

        {/* URL Info */}
        <div className="mt-6 sm:mt-12 text-center">
          <p className="text-gray-500 text-xs sm:text-sm">
            URL directa: <code className="bg-gray-800 px-2 py-1 rounded text-green-400 text-xs">/devops</code>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 mt-6 sm:mt-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <p className="text-center text-gray-500 text-xs sm:text-sm">
            ComputoPlus DevOps © 2026 - Sistema de gestión de infraestructura
          </p>
        </div>
      </div>
    </div>
  );
}
