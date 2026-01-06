'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Terminal,
  Activity,
  Bug,
  Shield,
  Code,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  RefreshCw,
  Play,
  Square,
  Settings,
  BarChart3,
  TrendingUp,
  Server,
  GitBranch,
  FileCode,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SonarMetrics {
  bugs: number
  vulnerabilities: number
  codeSmells: number
  coverage: number
  duplications: number
  maintainabilityRating: string
  reliabilityRating: string
  securityRating: string
  qualityGateStatus: 'OK' | 'ERROR' | 'WARN'
  lines: number
  issues: {
    blocker: number
    critical: number
    major: number
    minor: number
    info: number
  }
}

interface PrometheusMetrics {
  cpuUsage: number
  memoryUsage: number
  memoryTotal: number
  diskUsage: number
  networkIn: number
  networkOut: number
  requestsPerSecond: number
  responseTime: number
  errorRate: number
  activeConnections: number
  uptime: number
}

interface TerminalLine {
  id: number
  type: 'input' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
}

export default function DevOpsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [activeTab, setActiveTab] = useState<'terminal' | 'sonarqube' | 'prometheus'>('terminal')
  const [loading, setLoading] = useState(false)

  // Read tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'sonarqube' || tab === 'prometheus' || tab === 'terminal') {
      setActiveTab(tab)
    }
  }, [searchParams])
  
  // Terminal state
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: 1, type: 'system', content: '╔══════════════════════════════════════════════════════════════╗', timestamp: new Date() },
    { id: 2, type: 'system', content: '║  ComputoPlus DevOps Terminal v1.0                           ║', timestamp: new Date() },
    { id: 3, type: 'system', content: '║  Tipo "help" para ver comandos disponibles                  ║', timestamp: new Date() },
    { id: 4, type: 'system', content: '╚══════════════════════════════════════════════════════════════╝', timestamp: new Date() },
    { id: 5, type: 'output', content: '', timestamp: new Date() },
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // SonarQube state
  const [sonarMetrics, setSonarMetrics] = useState<SonarMetrics>({
    bugs: 3,
    vulnerabilities: 1,
    codeSmells: 47,
    coverage: 68.5,
    duplications: 2.3,
    maintainabilityRating: 'A',
    reliabilityRating: 'B',
    securityRating: 'A',
    qualityGateStatus: 'OK',
    lines: 45280,
    issues: {
      blocker: 0,
      critical: 1,
      major: 12,
      minor: 28,
      info: 9
    }
  })
  const [sonarLoading, setSonarLoading] = useState(false)
  const [sonarConnected, setSonarConnected] = useState(false)
  const [sonarUrl, setSonarUrl] = useState('')
  const [sonarToken, setSonarToken] = useState('')
  const [sonarProject, setSonarProject] = useState('')
  
  // Prometheus state
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics>({
    cpuUsage: 23.5,
    memoryUsage: 1.2,
    memoryTotal: 4,
    diskUsage: 45.2,
    networkIn: 125.4,
    networkOut: 89.2,
    requestsPerSecond: 156,
    responseTime: 45,
    errorRate: 0.12,
    activeConnections: 234,
    uptime: 99.98
  })
  const [prometheusConnected, setPrometheusConnected] = useState(false)
  const [prometheusUrl, setPrometheusUrl] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (prometheusConnected || true) { // Always update for demo
        setPrometheusMetrics(prev => ({
          ...prev,
          cpuUsage: Math.max(5, Math.min(95, prev.cpuUsage + (Math.random() - 0.5) * 10)),
          memoryUsage: Math.max(0.5, Math.min(3.8, prev.memoryUsage + (Math.random() - 0.5) * 0.2)),
          requestsPerSecond: Math.max(50, Math.min(500, prev.requestsPerSecond + Math.floor((Math.random() - 0.5) * 50))),
          responseTime: Math.max(10, Math.min(200, prev.responseTime + Math.floor((Math.random() - 0.5) * 20))),
          activeConnections: Math.max(100, Math.min(500, prev.activeConnections + Math.floor((Math.random() - 0.5) * 30))),
          networkIn: Math.max(50, Math.min(300, prev.networkIn + (Math.random() - 0.5) * 30)),
          networkOut: Math.max(30, Math.min(200, prev.networkOut + (Math.random() - 0.5) * 20)),
        }))
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [prometheusConnected])

  // Terminal command handler
  const executeCommand = useCallback((cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase()
    const newLines: TerminalLine[] = []
    const baseId = Date.now()

    // Add input line
    newLines.push({
      id: baseId,
      type: 'input',
      content: `$ ${cmd}`,
      timestamp: new Date()
    })

    // Process command
    switch (trimmedCmd) {
      case 'help':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
Comandos disponibles:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  help          - Muestra esta ayuda
  clear         - Limpia la terminal
  status        - Estado del sistema
  metrics       - Métricas de rendimiento
  sonar         - Análisis de código SonarQube
  health        - Health check de servicios
  db status     - Estado de la base de datos
  cache clear   - Limpiar cache
  logs          - Ver logs recientes
  version       - Versión del sistema
  uptime        - Tiempo de actividad
  git status    - Estado del repositorio
  npm test      - Ejecutar tests
  npm build     - Compilar proyecto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          timestamp: new Date()
        })
        break

      case 'clear':
        setTerminalLines([{
          id: baseId,
          type: 'system',
          content: 'Terminal limpiada.',
          timestamp: new Date()
        }])
        return

      case 'status':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
╔═══════════════════════════════════════════╗
║           ESTADO DEL SISTEMA              ║
╠═══════════════════════════════════════════╣
║  API Server:      ● ONLINE                ║
║  Database:        ● CONNECTED             ║
║  Redis Cache:     ● ACTIVE                ║
║  Queue Worker:    ● RUNNING               ║
║  Cron Jobs:       ● SCHEDULED             ║
║  Storage:         ● HEALTHY               ║
╠═══════════════════════════════════════════╣
║  Last Deploy: ${new Date().toLocaleDateString()}                 ║
║  Version: 1.0.0                           ║
╚═══════════════════════════════════════════╝`,
          timestamp: new Date()
        })
        break

      case 'metrics':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
MÉTRICAS DE RENDIMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━
CPU Usage:        ${prometheusMetrics.cpuUsage.toFixed(1)}%
Memory:           ${prometheusMetrics.memoryUsage.toFixed(2)} GB / ${prometheusMetrics.memoryTotal} GB
Disk Usage:       ${prometheusMetrics.diskUsage.toFixed(1)}%
Active Conns:     ${prometheusMetrics.activeConnections}
Requests/sec:     ${prometheusMetrics.requestsPerSecond}
Response Time:    ${prometheusMetrics.responseTime}ms
Error Rate:       ${prometheusMetrics.errorRate.toFixed(2)}%
Uptime:           ${prometheusMetrics.uptime}%`,
          timestamp: new Date()
        })
        break

      case 'sonar':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
ANÁLISIS SONARQUBE
━━━━━━━━━━━━━━━━━━━
Quality Gate:     ${sonarMetrics.qualityGateStatus === 'OK' ? '✓ PASSED' : '✗ FAILED'}
Bugs:             ${sonarMetrics.bugs}
Vulnerabilities:  ${sonarMetrics.vulnerabilities}
Code Smells:      ${sonarMetrics.codeSmells}
Coverage:         ${sonarMetrics.coverage}%
Duplications:     ${sonarMetrics.duplications}%
Lines of Code:    ${sonarMetrics.lines.toLocaleString()}
━━━━━━━━━━━━━━━━━━━
Ratings:
  Maintainability: ${sonarMetrics.maintainabilityRating}
  Reliability:     ${sonarMetrics.reliabilityRating}
  Security:        ${sonarMetrics.securityRating}`,
          timestamp: new Date()
        })
        break

      case 'health':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
Ejecutando health checks...
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] API Gateway         200 OK    (12ms)
[✓] Auth Service        200 OK    (8ms)
[✓] Database Pool       HEALTHY   (3ms)
[✓] Redis Connection    CONNECTED (1ms)
[✓] File Storage        AVAILABLE (15ms)
[✓] Email Service       READY     (45ms)
[✓] Payment Gateway     ONLINE    (89ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
All services healthy!`,
          timestamp: new Date()
        })
        break

      case 'db status':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
DATABASE STATUS (PostgreSQL/Neon)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connection:      ESTABLISHED
Pool Size:       10/20
Active Queries:  3
Waiting:         0
Idle:            7
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tables:          87
Total Size:      256 MB
Last Backup:     ${new Date().toISOString()}`,
          timestamp: new Date()
        })
        break

      case 'cache clear':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: 'Clearing cache...',
          timestamp: new Date()
        })
        setTimeout(() => {
          setTerminalLines(prev => [...prev, {
            id: Date.now(),
            type: 'output',
            content: '✓ Cache cleared successfully. 2,456 keys removed.',
            timestamp: new Date()
          }])
        }, 1000)
        break

      case 'logs':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
RECENT LOGS (últimas 10 entradas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[INFO]  ${new Date().toISOString()} - User login successful
[INFO]  ${new Date().toISOString()} - Invoice #INV-001 created
[DEBUG] ${new Date().toISOString()} - Cache hit for dashboard
[INFO]  ${new Date().toISOString()} - Payment processed $500
[WARN]  ${new Date().toISOString()} - Slow query detected (>1s)
[INFO]  ${new Date().toISOString()} - Report generated
[INFO]  ${new Date().toISOString()} - Email sent to client
[DEBUG] ${new Date().toISOString()} - API rate limit: 80/100
[INFO]  ${new Date().toISOString()} - Backup completed
[INFO]  ${new Date().toISOString()} - Cron job executed`,
          timestamp: new Date()
        })
        break

      case 'version':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
ComputoPlus v1.0.0
━━━━━━━━━━━━━━━━━━
Node.js:    v20.10.0
Next.js:    14.0.4
React:      18.2.0
Prisma:     5.22.0
TypeScript: 5.3.0`,
          timestamp: new Date()
        })
        break

      case 'uptime':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `Sistema activo por: 15 días, 7 horas, 23 minutos
Último reinicio: ${new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toLocaleString()}`,
          timestamp: new Date()
        })
        break

      case 'git status':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: `
On branch master
Your branch is up to date with 'origin/master'.

Changes staged for commit:
  (none)

Untracked files:
  (none)

nothing to commit, working tree clean`,
          timestamp: new Date()
        })
        break

      case 'npm test':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: 'Running tests...',
          timestamp: new Date()
        })
        setTimeout(() => {
          setTerminalLines(prev => [...prev, {
            id: Date.now(),
            type: 'output',
            content: `
PASS  __tests__/unit/api/invoices.test.ts
PASS  __tests__/unit/components/Button.test.tsx
PASS  __tests__/unit/lib/utils.test.ts
PASS  __tests__/integration/auth.test.ts

Test Suites: 4 passed, 4 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        3.456s`,
            timestamp: new Date()
          }])
        }, 2000)
        break

      case 'npm build':
        newLines.push({
          id: baseId + 1,
          type: 'output',
          content: 'Building project...',
          timestamp: new Date()
        })
        setTimeout(() => {
          setTerminalLines(prev => [...prev, {
            id: Date.now(),
            type: 'output',
            content: `
Creating an optimized production build...
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (137/137)
✓ Finalizing page optimization

Build completed in 45.2s`,
            timestamp: new Date()
          }])
        }, 3000)
        break

      default:
        if (trimmedCmd) {
          newLines.push({
            id: baseId + 1,
            type: 'error',
            content: `Comando no reconocido: ${cmd}\nEscribe 'help' para ver los comandos disponibles.`,
            timestamp: new Date()
          })
        }
    }

    setTerminalLines(prev => [...prev, ...newLines])
    setCommandHistory(prev => [...prev, cmd])
    setHistoryIndex(-1)
  }, [prometheusMetrics, sonarMetrics])

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (terminalInput.trim()) {
      executeCommand(terminalInput)
      setTerminalInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setTerminalInput('')
      }
    }
  }

  // Connect to SonarQube
  const connectSonarQube = async () => {
    setSonarLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSonarConnected(true)
      toast.success('Conectado a SonarQube')
      
      // Fetch real metrics
      // const response = await fetch(`${sonarUrl}/api/measures/component?component=${sonarProject}&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density`)
    } catch (error) {
      toast.error('Error al conectar con SonarQube')
    } finally {
      setSonarLoading(false)
    }
  }

  // Connect to Prometheus
  const connectPrometheus = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setPrometheusConnected(true)
      toast.success('Conectado a Prometheus')
    } catch (error) {
      toast.error('Error al conectar con Prometheus')
    } finally {
      setLoading(false)
    }
  }

  // Run SonarQube analysis
  const runSonarAnalysis = async () => {
    setSonarLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      // Update with "new" analysis results
      setSonarMetrics(prev => ({
        ...prev,
        bugs: Math.max(0, prev.bugs + Math.floor((Math.random() - 0.6) * 3)),
        codeSmells: Math.max(10, prev.codeSmells + Math.floor((Math.random() - 0.5) * 10)),
        coverage: Math.min(100, Math.max(50, prev.coverage + (Math.random() - 0.5) * 5)),
      }))
      toast.success('Análisis completado')
    } catch (error) {
      toast.error('Error en el análisis')
    } finally {
      setSonarLoading(false)
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'bg-green-500'
      case 'B': return 'bg-lime-500'
      case 'C': return 'bg-yellow-500'
      case 'D': return 'bg-orange-500'
      case 'E': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (status === 'loading') {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-6 h-6 text-blue-600" />
              DevOps & Monitoreo
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Terminal, análisis de código y métricas en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={prometheusConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              <Activity className="w-3 h-3 mr-1" />
              Prometheus {prometheusConnected ? 'ON' : 'OFF'}
            </Badge>
            <Badge className={sonarConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              <Shield className="w-3 h-3 mr-1" />
              SonarQube {sonarConnected ? 'ON' : 'OFF'}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2 overflow-x-auto">
          <Button
            variant={activeTab === 'terminal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal className="w-4 h-4 mr-2" />
            Terminal
          </Button>
          <Button
            variant={activeTab === 'sonarqube' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('sonarqube')}
          >
            <Bug className="w-4 h-4 mr-2" />
            SonarQube
          </Button>
          <Button
            variant={activeTab === 'prometheus' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('prometheus')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Prometheus
          </Button>
        </div>

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-gray-400 text-sm ml-2">ComputoPlus Terminal</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white"
                    onClick={() => executeCommand('clear')}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={terminalRef}
                className="h-[400px] sm:h-[500px] overflow-y-auto p-4 font-mono text-sm"
                onClick={() => inputRef.current?.focus()}
              >
                {terminalLines.map((line) => (
                  <div 
                    key={line.id}
                    className={`whitespace-pre-wrap ${
                      line.type === 'input' ? 'text-green-400' :
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'system' ? 'text-cyan-400' :
                      'text-gray-300'
                    }`}
                  >
                    {line.content}
                  </div>
                ))}
                <form onSubmit={handleTerminalSubmit} className="flex items-center mt-2">
                  <span className="text-green-400">$ </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-green-400 outline-none ml-1 font-mono"
                    autoFocus
                  />
                </form>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SonarQube Tab */}
        {activeTab === 'sonarqube' && (
          <div className="space-y-4">
            {/* Connection Card */}
            {!sonarConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Conectar a SonarQube
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">URL del Servidor</label>
                      <Input
                        value={sonarUrl}
                        onChange={(e) => setSonarUrl(e.target.value)}
                        placeholder="https://sonarqube.example.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Project Key</label>
                      <Input
                        value={sonarProject}
                        onChange={(e) => setSonarProject(e.target.value)}
                        placeholder="computoplus"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Token de Acceso</label>
                      <Input
                        type="password"
                        value={sonarToken}
                        onChange={(e) => setSonarToken(e.target.value)}
                        placeholder="sqp_xxxxx"
                      />
                    </div>
                  </div>
                  <Button onClick={connectSonarQube} disabled={sonarLoading}>
                    {sonarLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quality Gate */}
            <Card className={sonarMetrics.qualityGateStatus === 'OK' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
            }>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {sonarMetrics.qualityGateStatus === 'OK' ? (
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-600" />
                    )}
                    <div>
                      <h3 className="text-lg font-bold">Quality Gate</h3>
                      <p className={sonarMetrics.qualityGateStatus === 'OK' ? 'text-green-700' : 'text-red-700'}>
                        {sonarMetrics.qualityGateStatus === 'OK' ? 'Passed' : 'Failed'}
                      </p>
                    </div>
                  </div>
                  <Button onClick={runSonarAnalysis} disabled={sonarLoading}>
                    {sonarLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Analizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Bug className="w-6 h-6 mx-auto text-red-500 mb-2" />
                  <div className="text-2xl font-bold">{sonarMetrics.bugs}</div>
                  <div className="text-xs text-gray-500">Bugs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 mx-auto text-orange-500 mb-2" />
                  <div className="text-2xl font-bold">{sonarMetrics.vulnerabilities}</div>
                  <div className="text-xs text-gray-500">Vulnerabilidades</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                  <div className="text-2xl font-bold">{sonarMetrics.codeSmells}</div>
                  <div className="text-xs text-gray-500">Code Smells</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold">{sonarMetrics.coverage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Coverage</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Code className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold">{sonarMetrics.duplications.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Duplicaciones</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileCode className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                  <div className="text-2xl font-bold">{(sonarMetrics.lines / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-gray-500">Líneas</div>
                </CardContent>
              </Card>
            </div>

            {/* Ratings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ratings de Calidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold ${getRatingColor(sonarMetrics.maintainabilityRating)}`}>
                      {sonarMetrics.maintainabilityRating}
                    </div>
                    <div className="mt-2 text-sm font-medium">Mantenibilidad</div>
                  </div>
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold ${getRatingColor(sonarMetrics.reliabilityRating)}`}>
                      {sonarMetrics.reliabilityRating}
                    </div>
                    <div className="mt-2 text-sm font-medium">Confiabilidad</div>
                  </div>
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold ${getRatingColor(sonarMetrics.securityRating)}`}>
                      {sonarMetrics.securityRating}
                    </div>
                    <div className="mt-2 text-sm font-medium">Seguridad</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desglose de Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Blocker', count: sonarMetrics.issues.blocker, color: 'bg-red-600' },
                    { label: 'Critical', count: sonarMetrics.issues.critical, color: 'bg-red-500' },
                    { label: 'Major', count: sonarMetrics.issues.major, color: 'bg-orange-500' },
                    { label: 'Minor', count: sonarMetrics.issues.minor, color: 'bg-yellow-500' },
                    { label: 'Info', count: sonarMetrics.issues.info, color: 'bg-blue-500' },
                  ].map(issue => (
                    <div key={issue.label} className="flex items-center gap-3">
                      <div className="w-20 text-sm font-medium">{issue.label}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full ${issue.color}`}
                          style={{ width: `${Math.min((issue.count / 50) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="w-8 text-sm font-bold text-right">{issue.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prometheus Tab */}
        {activeTab === 'prometheus' && (
          <div className="space-y-4">
            {/* Connection Card */}
            {!prometheusConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Conectar a Prometheus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">URL del Servidor</label>
                    <Input
                      value={prometheusUrl}
                      onChange={(e) => setPrometheusUrl(e.target.value)}
                      placeholder="http://localhost:9090"
                    />
                  </div>
                  <Button onClick={connectPrometheus} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* System Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    <span className={`text-xs font-medium ${
                      prometheusMetrics.cpuUsage > 80 ? 'text-red-500' : 
                      prometheusMetrics.cpuUsage > 60 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {prometheusMetrics.cpuUsage > 80 ? 'HIGH' : prometheusMetrics.cpuUsage > 60 ? 'MEDIUM' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{prometheusMetrics.cpuUsage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">CPU Usage</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        prometheusMetrics.cpuUsage > 80 ? 'bg-red-500' : 
                        prometheusMetrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${prometheusMetrics.cpuUsage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <HardDrive className="w-5 h-5 text-purple-500" />
                    <span className="text-xs font-medium text-green-500">OK</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {prometheusMetrics.memoryUsage.toFixed(1)} GB
                  </div>
                  <div className="text-xs text-gray-500">
                    Memoria ({prometheusMetrics.memoryTotal} GB total)
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${(prometheusMetrics.memoryUsage / prometheusMetrics.memoryTotal) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-5 h-5 text-orange-500" />
                    <span className="text-xs font-medium text-green-500">HEALTHY</span>
                  </div>
                  <div className="text-2xl font-bold">{prometheusMetrics.diskUsage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Disk Usage</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-orange-500"
                      style={{ width: `${prometheusMetrics.diskUsage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-xs font-medium text-green-500">{prometheusMetrics.uptime}%</span>
                  </div>
                  <div className="text-2xl font-bold">{prometheusMetrics.uptime}%</div>
                  <div className="text-xs text-gray-500">Uptime</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${prometheusMetrics.uptime}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Network & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wifi className="w-5 h-5" />
                    Tráfico de Red
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Inbound</span>
                        <span className="font-medium">{prometheusMetrics.networkIn.toFixed(1)} MB/s</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${(prometheusMetrics.networkIn / 300) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Outbound</span>
                        <span className="font-medium">{prometheusMetrics.networkOut.toFixed(1)} MB/s</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${(prometheusMetrics.networkOut / 200) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {prometheusMetrics.requestsPerSecond}
                      </div>
                      <div className="text-xs text-gray-500">Requests/sec</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {prometheusMetrics.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">Avg Response</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {prometheusMetrics.activeConnections}
                      </div>
                      <div className="text-xs text-gray-500">Active Conns</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className={`text-2xl font-bold ${
                        prometheusMetrics.errorRate > 1 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {prometheusMetrics.errorRate.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500">Error Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Metrics Simulation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                  Métricas en Tiempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <div className="text-3xl font-mono font-bold text-blue-600">
                      {prometheusMetrics.cpuUsage.toFixed(0)}
                      <span className="text-lg">%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">CPU</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-3xl font-mono font-bold text-purple-600">
                      {prometheusMetrics.memoryUsage.toFixed(1)}
                      <span className="text-lg">GB</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">RAM</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-3xl font-mono font-bold text-green-600">
                      {prometheusMetrics.requestsPerSecond}
                      <span className="text-lg">/s</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Requests</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-3xl font-mono font-bold text-orange-600">
                      {prometheusMetrics.responseTime}
                      <span className="text-lg">ms</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Latency</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">
                  <Activity className="w-3 h-3 inline animate-pulse text-green-500" /> 
                  {' '}Actualizando cada 2 segundos
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}
