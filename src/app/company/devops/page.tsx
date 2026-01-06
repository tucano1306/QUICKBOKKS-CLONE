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
  Loader2,
  Workflow,
  Box,
  Layers,
  PlayCircle,
  PauseCircle,
  History,
  FolderTree,
  FileText,
  Users,
  Zap,
  Target,
  Package,
  Cog
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

// Jenkins interfaces
interface JenkinsPipeline {
  id: string
  name: string
  status: 'success' | 'failed' | 'running' | 'pending' | 'cancelled'
  branch: string
  commit: string
  duration: string
  timestamp: Date
  stages: JenkinsStage[]
}

interface JenkinsStage {
  name: string
  status: 'success' | 'failed' | 'running' | 'pending' | 'skipped'
  duration: string
}

interface JenkinsJob {
  name: string
  lastBuild: number
  lastSuccess: string
  lastFailure: string
  health: number
}

// Puppet interfaces
interface PuppetAgent {
  hostname: string
  status: 'active' | 'inactive' | 'failed' | 'unresponsive'
  environment: string
  lastRun: Date
  changes: number
  failures: number
}

interface PuppetModule {
  name: string
  version: string
  source: string
  installed: boolean
}

// Ansible interfaces
interface AnsiblePlaybook {
  name: string
  hosts: string
  tasks: number
  lastRun: Date
  status: 'success' | 'failed' | 'running' | 'never'
  duration: string
}

interface AnsibleHost {
  hostname: string
  ip: string
  group: string
  status: 'reachable' | 'unreachable'
  lastPing: Date
}

export default function DevOpsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [activeTab, setActiveTab] = useState<'terminal' | 'sonarqube' | 'prometheus' | 'jenkins' | 'puppet' | 'ansible'>('terminal')
  const [loading, setLoading] = useState(false)

  // Read tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'sonarqube' || tab === 'prometheus' || tab === 'terminal' || tab === 'jenkins' || tab === 'puppet' || tab === 'ansible') {
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

  // Jenkins state
  const [jenkinsConnected, setJenkinsConnected] = useState(false)
  const [jenkinsUrl, setJenkinsUrl] = useState('')
  const [jenkinsUser, setJenkinsUser] = useState('')
  const [jenkinsToken, setJenkinsToken] = useState('')
  const [jenkinsLoading, setJenkinsLoading] = useState(false)
  const [jenkinsPipelines, setJenkinsPipelines] = useState<JenkinsPipeline[]>([
    {
      id: '1',
      name: 'computoplus-main',
      status: 'success',
      branch: 'main',
      commit: 'a1b2c3d',
      duration: '5m 23s',
      timestamp: new Date(Date.now() - 3600000),
      stages: [
        { name: 'Checkout', status: 'success', duration: '12s' },
        { name: 'Install', status: 'success', duration: '1m 45s' },
        { name: 'Lint', status: 'success', duration: '32s' },
        { name: 'Test', status: 'success', duration: '2m 15s' },
        { name: 'Build', status: 'success', duration: '45s' },
        { name: 'Deploy', status: 'success', duration: '34s' },
      ]
    },
    {
      id: '2',
      name: 'computoplus-develop',
      status: 'running',
      branch: 'develop',
      commit: 'e4f5g6h',
      duration: '2m 10s',
      timestamp: new Date(),
      stages: [
        { name: 'Checkout', status: 'success', duration: '10s' },
        { name: 'Install', status: 'success', duration: '1m 30s' },
        { name: 'Lint', status: 'running', duration: '...' },
        { name: 'Test', status: 'pending', duration: '-' },
        { name: 'Build', status: 'pending', duration: '-' },
        { name: 'Deploy', status: 'pending', duration: '-' },
      ]
    },
    {
      id: '3',
      name: 'computoplus-feature',
      status: 'failed',
      branch: 'feature/new-dashboard',
      commit: 'i7j8k9l',
      duration: '3m 45s',
      timestamp: new Date(Date.now() - 7200000),
      stages: [
        { name: 'Checkout', status: 'success', duration: '11s' },
        { name: 'Install', status: 'success', duration: '1m 40s' },
        { name: 'Lint', status: 'success', duration: '28s' },
        { name: 'Test', status: 'failed', duration: '1m 26s' },
        { name: 'Build', status: 'skipped', duration: '-' },
        { name: 'Deploy', status: 'skipped', duration: '-' },
      ]
    },
  ])
  const [jenkinsJobs, setJenkinsJobs] = useState<JenkinsJob[]>([
    { name: 'Build-Main', lastBuild: 156, lastSuccess: '1 hour ago', lastFailure: '3 days ago', health: 95 },
    { name: 'Build-Develop', lastBuild: 234, lastSuccess: 'Running', lastFailure: '2 hours ago', health: 78 },
    { name: 'Deploy-Staging', lastBuild: 89, lastSuccess: '30 min ago', lastFailure: '1 week ago', health: 100 },
    { name: 'Deploy-Production', lastBuild: 45, lastSuccess: '2 days ago', lastFailure: '1 month ago', health: 100 },
    { name: 'Nightly-Tests', lastBuild: 67, lastSuccess: 'Yesterday', lastFailure: '5 days ago', health: 88 },
  ])

  // Puppet state
  const [puppetConnected, setPuppetConnected] = useState(false)
  const [puppetUrl, setPuppetUrl] = useState('')
  const [puppetToken, setPuppetToken] = useState('')
  const [puppetLoading, setPuppetLoading] = useState(false)
  const [puppetAgents, setPuppetAgents] = useState<PuppetAgent[]>([
    { hostname: 'web-server-01', status: 'active', environment: 'production', lastRun: new Date(Date.now() - 1800000), changes: 0, failures: 0 },
    { hostname: 'web-server-02', status: 'active', environment: 'production', lastRun: new Date(Date.now() - 2100000), changes: 2, failures: 0 },
    { hostname: 'db-server-01', status: 'active', environment: 'production', lastRun: new Date(Date.now() - 900000), changes: 0, failures: 0 },
    { hostname: 'staging-01', status: 'active', environment: 'staging', lastRun: new Date(Date.now() - 3600000), changes: 5, failures: 0 },
    { hostname: 'dev-server-01', status: 'failed', environment: 'development', lastRun: new Date(Date.now() - 7200000), changes: 0, failures: 3 },
    { hostname: 'backup-server', status: 'unresponsive', environment: 'production', lastRun: new Date(Date.now() - 86400000), changes: 0, failures: 0 },
  ])
  const [puppetModules, setPuppetModules] = useState<PuppetModule[]>([
    { name: 'puppetlabs-apache', version: '8.4.0', source: 'Puppet Forge', installed: true },
    { name: 'puppetlabs-mysql', version: '14.0.0', source: 'Puppet Forge', installed: true },
    { name: 'puppetlabs-postgresql', version: '9.2.0', source: 'Puppet Forge', installed: true },
    { name: 'puppetlabs-nginx', version: '4.4.0', source: 'Puppet Forge', installed: true },
    { name: 'puppetlabs-firewall', version: '5.0.0', source: 'Puppet Forge', installed: true },
    { name: 'puppetlabs-docker', version: '6.1.0', source: 'Puppet Forge', installed: false },
  ])

  // Ansible state
  const [ansibleConnected, setAnsibleConnected] = useState(false)
  const [ansibleControlNode, setAnsibleControlNode] = useState('')
  const [ansibleLoading, setAnsibleLoading] = useState(false)
  const [ansiblePlaybooks, setAnsiblePlaybooks] = useState<AnsiblePlaybook[]>([
    { name: 'deploy-app.yml', hosts: 'webservers', tasks: 15, lastRun: new Date(Date.now() - 3600000), status: 'success', duration: '2m 34s' },
    { name: 'configure-nginx.yml', hosts: 'loadbalancers', tasks: 8, lastRun: new Date(Date.now() - 7200000), status: 'success', duration: '1m 12s' },
    { name: 'database-backup.yml', hosts: 'dbservers', tasks: 5, lastRun: new Date(Date.now() - 1800000), status: 'running', duration: '...' },
    { name: 'security-updates.yml', hosts: 'all', tasks: 12, lastRun: new Date(Date.now() - 86400000), status: 'success', duration: '5m 45s' },
    { name: 'monitoring-setup.yml', hosts: 'monitoring', tasks: 20, lastRun: new Date(Date.now() - 172800000), status: 'failed', duration: '3m 22s' },
    { name: 'new-server-provision.yml', hosts: 'new_servers', tasks: 25, lastRun: new Date(), status: 'never', duration: '-' },
  ])
  const [ansibleHosts, setAnsibleHosts] = useState<AnsibleHost[]>([
    { hostname: 'web-01.computoplus.com', ip: '10.0.1.10', group: 'webservers', status: 'reachable', lastPing: new Date() },
    { hostname: 'web-02.computoplus.com', ip: '10.0.1.11', group: 'webservers', status: 'reachable', lastPing: new Date() },
    { hostname: 'db-01.computoplus.com', ip: '10.0.2.10', group: 'dbservers', status: 'reachable', lastPing: new Date() },
    { hostname: 'lb-01.computoplus.com', ip: '10.0.3.10', group: 'loadbalancers', status: 'reachable', lastPing: new Date() },
    { hostname: 'monitor-01.computoplus.com', ip: '10.0.4.10', group: 'monitoring', status: 'unreachable', lastPing: new Date(Date.now() - 3600000) },
    { hostname: 'backup-01.computoplus.com', ip: '10.0.5.10', group: 'backup', status: 'reachable', lastPing: new Date() },
  ])

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

  // Connect to Jenkins
  const connectJenkins = async () => {
    setJenkinsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setJenkinsConnected(true)
      toast.success('Conectado a Jenkins')
    } catch (error) {
      toast.error('Error al conectar con Jenkins')
    } finally {
      setJenkinsLoading(false)
    }
  }

  // Trigger Jenkins build
  const triggerJenkinsBuild = async (pipelineName: string) => {
    toast.loading(`Iniciando build para ${pipelineName}...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    toast.dismiss()
    toast.success(`Build iniciado: ${pipelineName}`)
  }

  // Connect to Puppet
  const connectPuppet = async () => {
    setPuppetLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setPuppetConnected(true)
      toast.success('Conectado a Puppet Master')
    } catch (error) {
      toast.error('Error al conectar con Puppet')
    } finally {
      setPuppetLoading(false)
    }
  }

  // Run Puppet agent
  const runPuppetAgent = async (hostname: string) => {
    toast.loading(`Ejecutando Puppet en ${hostname}...`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    toast.dismiss()
    toast.success(`Puppet aplicado en ${hostname}`)
    setPuppetAgents(prev => prev.map(agent => 
      agent.hostname === hostname 
        ? { ...agent, lastRun: new Date(), changes: Math.floor(Math.random() * 5) }
        : agent
    ))
  }

  // Connect to Ansible
  const connectAnsible = async () => {
    setAnsibleLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setAnsibleConnected(true)
      toast.success('Conectado al Control Node de Ansible')
    } catch (error) {
      toast.error('Error al conectar con Ansible')
    } finally {
      setAnsibleLoading(false)
    }
  }

  // Run Ansible playbook
  const runAnsiblePlaybook = async (playbookName: string) => {
    toast.loading(`Ejecutando playbook ${playbookName}...`)
    setAnsiblePlaybooks(prev => prev.map(pb => 
      pb.name === playbookName ? { ...pb, status: 'running' as const, lastRun: new Date(), duration: '...' } : pb
    ))
    await new Promise(resolve => setTimeout(resolve, 4000))
    toast.dismiss()
    const success = Math.random() > 0.2
    setAnsiblePlaybooks(prev => prev.map(pb => 
      pb.name === playbookName 
        ? { ...pb, status: success ? 'success' as const : 'failed' as const, duration: `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 59)}s` }
        : pb
    ))
    if (success) {
      toast.success(`Playbook ${playbookName} completado`)
    } else {
      toast.error(`Playbook ${playbookName} falló`)
    }
  }

  // Ping Ansible host
  const pingAnsibleHost = async (hostname: string) => {
    toast.loading(`Verificando ${hostname}...`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.dismiss()
    const reachable = Math.random() > 0.1
    setAnsibleHosts(prev => prev.map(host => 
      host.hostname === hostname 
        ? { ...host, status: reachable ? 'reachable' as const : 'unreachable' as const, lastPing: new Date() }
        : host
    ))
    if (reachable) {
      toast.success(`${hostname} está accesible`)
    } else {
      toast.error(`${hostname} no responde`)
    }
  }

  // Helper functions for status
  const getJenkinsStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'running': return 'bg-blue-500'
      case 'pending': return 'bg-gray-400'
      case 'cancelled': return 'bg-orange-500'
      case 'skipped': return 'bg-gray-300'
      default: return 'bg-gray-500'
    }
  }

  const getPuppetStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'inactive': return 'text-gray-600 bg-gray-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'unresponsive': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAnsibleStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'never': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
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
              Terminal, CI/CD, análisis de código, gestión de configuración y monitoreo
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={jenkinsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              <Workflow className="w-3 h-3 mr-1" />
              Jenkins {jenkinsConnected ? 'ON' : 'OFF'}
            </Badge>
            <Badge className={puppetConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              <Box className="w-3 h-3 mr-1" />
              Puppet {puppetConnected ? 'ON' : 'OFF'}
            </Badge>
            <Badge className={ansibleConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              <Zap className="w-3 h-3 mr-1" />
              Ansible {ansibleConnected ? 'ON' : 'OFF'}
            </Badge>
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
            variant={activeTab === 'jenkins' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('jenkins')}
            className={jenkinsConnected ? '' : ''}
          >
            <Workflow className="w-4 h-4 mr-2" />
            Jenkins
          </Button>
          <Button
            variant={activeTab === 'puppet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('puppet')}
          >
            <Box className="w-4 h-4 mr-2" />
            Puppet
          </Button>
          <Button
            variant={activeTab === 'ansible' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('ansible')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Ansible
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

        {/* Jenkins Tab */}
        {activeTab === 'jenkins' && (
          <div className="space-y-4">
            {/* Connection Card */}
            {!jenkinsConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-orange-500" />
                    Conectar a Jenkins
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">URL del Servidor</label>
                      <Input
                        value={jenkinsUrl}
                        onChange={(e) => setJenkinsUrl(e.target.value)}
                        placeholder="https://jenkins.example.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Usuario</label>
                      <Input
                        value={jenkinsUser}
                        onChange={(e) => setJenkinsUser(e.target.value)}
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">API Token</label>
                      <Input
                        type="password"
                        value={jenkinsToken}
                        onChange={(e) => setJenkinsToken(e.target.value)}
                        placeholder="Token de API"
                      />
                    </div>
                  </div>
                  <Button onClick={connectJenkins} disabled={jenkinsLoading}>
                    {jenkinsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Workflow className="w-4 h-4 mr-2" />}
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pipeline Status Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {jenkinsPipelines.filter(p => p.status === 'success').length}
                  </div>
                  <div className="text-xs text-green-600">Exitosos</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-blue-600 mb-2 animate-spin" />
                  <div className="text-2xl font-bold text-blue-700">
                    {jenkinsPipelines.filter(p => p.status === 'running').length}
                  </div>
                  <div className="text-xs text-blue-600">En Ejecución</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-700">
                    {jenkinsPipelines.filter(p => p.status === 'failed').length}
                  </div>
                  <div className="text-xs text-red-600">Fallidos</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <div className="text-2xl font-bold text-gray-700">
                    {jenkinsPipelines.filter(p => p.status === 'pending').length}
                  </div>
                  <div className="text-xs text-gray-600">Pendientes</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Pipelines */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Pipelines Recientes
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Actualizando...')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jenkinsPipelines.map((pipeline) => (
                    <div key={pipeline.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getJenkinsStatusColor(pipeline.status)} ${pipeline.status === 'running' ? 'animate-pulse' : ''}`} />
                          <div>
                            <div className="font-medium">{pipeline.name}</div>
                            <div className="text-xs text-gray-500">
                              {pipeline.branch} • {pipeline.commit} • {pipeline.duration}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={pipeline.status === 'success' ? 'default' : pipeline.status === 'failed' ? 'destructive' : 'secondary'}>
                            {pipeline.status.toUpperCase()}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => triggerJenkinsBuild(pipeline.name)}>
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Pipeline Stages */}
                      <div className="flex gap-1">
                        {pipeline.stages.map((stage, idx) => (
                          <div key={idx} className="flex-1">
                            <div className={`h-2 rounded ${getJenkinsStatusColor(stage.status)} ${stage.status === 'running' ? 'animate-pulse' : ''}`} />
                            <div className="text-xs text-center mt-1 text-gray-500 truncate">{stage.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Jobs Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Salud de Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jenkinsJobs.map((job, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{job.name}</div>
                        <div className="text-xs text-gray-500">
                          Build #{job.lastBuild} • Último éxito: {job.lastSuccess}
                        </div>
                      </div>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Health</span>
                          <span className={job.health >= 80 ? 'text-green-600' : job.health >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                            {job.health}%
                          </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${job.health >= 80 ? 'bg-green-500' : job.health >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${job.health}%` }}
                          />
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => triggerJenkinsBuild(job.name)}>
                        <PlayCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Puppet Tab */}
        {activeTab === 'puppet' && (
          <div className="space-y-4">
            {/* Connection Card */}
            {!puppetConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Box className="w-5 h-5 text-orange-500" />
                    Conectar a Puppet Master
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">URL del Puppet Master</label>
                      <Input
                        value={puppetUrl}
                        onChange={(e) => setPuppetUrl(e.target.value)}
                        placeholder="https://puppet.example.com:8140"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Token de Autenticación</label>
                      <Input
                        type="password"
                        value={puppetToken}
                        onChange={(e) => setPuppetToken(e.target.value)}
                        placeholder="Token de PE"
                      />
                    </div>
                  </div>
                  <Button onClick={connectPuppet} disabled={puppetLoading}>
                    {puppetLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Box className="w-4 h-4 mr-2" />}
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Agent Status Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {puppetAgents.filter(a => a.status === 'active').length}
                  </div>
                  <div className="text-xs text-green-600">Activos</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-700">
                    {puppetAgents.filter(a => a.status === 'failed').length}
                  </div>
                  <div className="text-xs text-red-600">Fallidos</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-700">
                    {puppetAgents.filter(a => a.status === 'unresponsive').length}
                  </div>
                  <div className="text-xs text-orange-600">Sin Respuesta</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-700">
                    {puppetModules.filter(m => m.installed).length}
                  </div>
                  <div className="text-xs text-blue-600">Módulos Instalados</div>
                </CardContent>
              </Card>
            </div>

            {/* Puppet Agents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Agentes Puppet
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Sincronizando agentes...')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Hostname</th>
                        <th className="text-left py-2 px-3">Estado</th>
                        <th className="text-left py-2 px-3">Entorno</th>
                        <th className="text-left py-2 px-3">Última Ejecución</th>
                        <th className="text-center py-2 px-3">Cambios</th>
                        <th className="text-center py-2 px-3">Fallos</th>
                        <th className="text-center py-2 px-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puppetAgents.map((agent, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{agent.hostname}</td>
                          <td className="py-2 px-3">
                            <Badge className={getPuppetStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">{agent.environment}</td>
                          <td className="py-2 px-3 text-gray-500">
                            {new Date(agent.lastRun).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={agent.changes > 0 ? 'default' : 'secondary'}>
                              {agent.changes}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={agent.failures > 0 ? 'destructive' : 'secondary'}>
                              {agent.failures}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button size="sm" variant="ghost" onClick={() => runPuppetAgent(agent.hostname)}>
                              <Play className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Puppet Modules */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Módulos Puppet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {puppetModules.map((module, idx) => (
                    <div key={idx} className={`p-3 border rounded-lg ${module.installed ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{module.name}</div>
                          <div className="text-xs text-gray-500">v{module.version} • {module.source}</div>
                        </div>
                        {module.installed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => toast.success(`Instalando ${module.name}...`)}>
                            Instalar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ansible Tab */}
        {activeTab === 'ansible' && (
          <div className="space-y-4">
            {/* Connection Card */}
            {!ansibleConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    Conectar a Ansible Control Node
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Control Node (SSH)</label>
                    <Input
                      value={ansibleControlNode}
                      onChange={(e) => setAnsibleControlNode(e.target.value)}
                      placeholder="user@ansible-control.example.com"
                    />
                  </div>
                  <Button onClick={connectAnsible} disabled={ansibleLoading}>
                    {ansibleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Playbook Status Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {ansiblePlaybooks.filter(p => p.status === 'success').length}
                  </div>
                  <div className="text-xs text-green-600">Exitosos</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-blue-600 mb-2 animate-spin" />
                  <div className="text-2xl font-bold text-blue-700">
                    {ansiblePlaybooks.filter(p => p.status === 'running').length}
                  </div>
                  <div className="text-xs text-blue-600">En Ejecución</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-700">
                    {ansiblePlaybooks.filter(p => p.status === 'failed').length}
                  </div>
                  <div className="text-xs text-red-600">Fallidos</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-700">
                    {ansibleHosts.filter(h => h.status === 'reachable').length}/{ansibleHosts.length}
                  </div>
                  <div className="text-xs text-purple-600">Hosts Activos</div>
                </CardContent>
              </Card>
            </div>

            {/* Playbooks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Playbooks
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Escaneando playbooks...')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Escanear
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ansiblePlaybooks.map((playbook, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{playbook.name}</div>
                          <div className="text-xs text-gray-500">
                            Hosts: {playbook.hosts} • {playbook.tasks} tasks • {playbook.duration}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getAnsibleStatusColor(playbook.status)}>
                          {playbook.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {playbook.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => runAnsiblePlaybook(playbook.name)}
                          disabled={playbook.status === 'running'}
                        >
                          <PlayCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-5 h-5" />
                    Inventario de Hosts
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    ansibleHosts.forEach(h => pingAnsibleHost(h.hostname))
                  }}>
                    <Wifi className="w-4 h-4 mr-2" />
                    Ping All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Hostname</th>
                        <th className="text-left py-2 px-3">IP</th>
                        <th className="text-left py-2 px-3">Grupo</th>
                        <th className="text-left py-2 px-3">Estado</th>
                        <th className="text-left py-2 px-3">Último Ping</th>
                        <th className="text-center py-2 px-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ansibleHosts.map((host, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{host.hostname}</td>
                          <td className="py-2 px-3 font-mono text-gray-600">{host.ip}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline">{host.group}</Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Badge className={host.status === 'reachable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {host.status === 'reachable' ? (
                                <><CheckCircle className="w-3 h-3 mr-1" /> Accesible</>
                              ) : (
                                <><XCircle className="w-3 h-3 mr-1" /> Sin Conexión</>
                              )}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs">
                            {new Date(host.lastPing).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button size="sm" variant="ghost" onClick={() => pingAnsibleHost(host.hostname)}>
                              <Wifi className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Commands */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cog className="w-5 h-5" />
                  Comandos Rápidos (Ad-hoc)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => toast.success('Ejecutando: ansible all -m ping')}>
                    <Wifi className="w-5 h-5 mb-1" />
                    <span className="text-xs">Ping All</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => toast.success('Ejecutando: ansible all -m setup')}>
                    <Database className="w-5 h-5 mb-1" />
                    <span className="text-xs">Gather Facts</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => toast.success('Ejecutando: ansible all -m shell -a "uptime"')}>
                    <Clock className="w-5 h-5 mb-1" />
                    <span className="text-xs">Uptime</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => toast.success('Ejecutando: ansible all -m shell -a "df -h"')}>
                    <HardDrive className="w-5 h-5 mb-1" />
                    <span className="text-xs">Disk Space</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}
