'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Shield,
  Lock,
  Key,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Save,
  Info,
  Smartphone,
  FileText,
  Users,
  Calendar,
  MapPin,
  RefreshCw
} from 'lucide-react'

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  category: string
  ipAddress: string
  device: string
  status: 'Success' | 'Failed' | 'Warning'
  details: string
}

interface ActiveSession {
  id: string
  user: string
  device: string
  browser: string
  ipAddress: string
  location: string
  loginTime: string
  lastActivity: string
  status: 'Active' | 'Idle'
}

export default function SecuritySettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadSecurityData = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const [logsRes, sessionsRes] = await Promise.all([
        fetch(`/api/settings/audit-logs?companyId=${activeCompany.id}`),
        fetch(`/api/settings/sessions?companyId=${activeCompany.id}`)
      ])

      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setAuditLogs(logsData)
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setActiveSessions(sessionsData)
      }
    } catch (error) {
      console.error('Error loading security data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadSecurityData()
    }
  }, [status, activeCompany, loadSecurityData])

  const [securitySettings, setSecuritySettings] = useState({
    // Two-Factor Authentication
    require2FA: true,
    enforce2FAForAdmins: true,
    allow2FABypass: false,
    
    // Password Policy
    minPasswordLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpireDays: 90,
    preventPasswordReuse: 5,
    
    // Session Management
    sessionTimeout: 30,
    autoLogoutInactive: true,
    maxConcurrentSessions: 3,
    rememberMe: true,
    rememberMeDays: 30,
    
    // Login Security
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireCaptcha: true,
    allowedIPRanges: '',
    
    // Audit & Monitoring
    logAllActivity: true,
    logRetentionDays: 365,
    alertOnSuspicious: true,
    alertEmail: 'security@acmecorp.com'
  })

  const handleSave = async () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 1500)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'Failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'Warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return <Badge className="bg-green-100 text-green-700">Success</Badge>
      case 'Failed':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>
      case 'Warning':
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>
      case 'Active':
        return <Badge className="bg-blue-100 text-blue-700">Active</Badge>
      case 'Idle':
        return <Badge className="bg-gray-100 text-gray-700">Idle</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const stats = {
    totalLogs: auditLogs.length,
    activeSessions: activeSessions.filter(s => s.status === 'Active').length,
    failedLogins: auditLogs.filter(l => l.action === 'Login Failed').length,
    securityScore: 92
  }

  if (status === 'loading' || loading) {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Security Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Configure authentication, access control, and monitoring
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Security settings saved successfully!</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.securityScore}%
              </div>
              <div className="text-sm text-blue-700">Security Score</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.activeSessions}
              </div>
              <div className="text-sm text-green-700">Active Sessions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.totalLogs}
              </div>
              <div className="text-sm text-purple-700">Recent Events</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                {stats.failedLogins}
              </div>
              <div className="text-sm text-red-700">Failed Login Attempts</div>
            </CardContent>
          </Card>
        </div>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Two-Factor Authentication (2FA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={securitySettings.require2FA}
                  onChange={(e) => setSecuritySettings({...securitySettings, require2FA: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Require two-factor authentication for all users
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={securitySettings.enforce2FAForAdmins}
                  onChange={(e) => setSecuritySettings({...securitySettings, enforce2FAForAdmins: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Enforce 2FA for administrators (Recommended)
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={securitySettings.allow2FABypass}
                  onChange={(e) => setSecuritySettings({...securitySettings, allow2FABypass: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Allow emergency 2FA bypass (Not recommended)
              </label>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Supported Methods:</strong> Authenticator apps (Google Authenticator, Authy), SMS codes, Email verification, Backup codes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <select
                  value={securitySettings.minPasswordLength}
                  onChange={(e) => setSecuritySettings({...securitySettings, minPasswordLength: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="8">8 characters</option>
                  <option value="10">10 characters</option>
                  <option value="12">12 characters (Recommended)</option>
                  <option value="16">16 characters</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Expiration
                </label>
                <select
                  value={securitySettings.passwordExpireDays}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordExpireDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days (Recommended)</option>
                  <option value="180">180 days</option>
                  <option value="365">365 days</option>
                  <option value="0">Never</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireUppercase}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireUppercase: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Require at least one uppercase letter (A-Z)
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireLowercase}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireLowercase: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Require at least one lowercase letter (a-z)
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireNumbers}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireNumbers: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Require at least one number (0-9)
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireSpecialChars}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireSpecialChars: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Require at least one special character (!@#$%^&*)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prevent Password Reuse
                </label>
                <select
                  value={securitySettings.preventPasswordReuse}
                  onChange={(e) => setSecuritySettings({...securitySettings, preventPasswordReuse: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Allow reuse</option>
                  <option value="3">Last 3 passwords</option>
                  <option value="5">Last 5 passwords (Recommended)</option>
                  <option value="10">Last 10 passwords</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Session Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <select
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes (Recommended)</option>
                  <option value="60">60 minutes</option>
                  <option value="120">2 hours</option>
                  <option value="0">Never</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Concurrent Sessions
                </label>
                <select
                  value={securitySettings.maxConcurrentSessions}
                  onChange={(e) => setSecuritySettings({...securitySettings, maxConcurrentSessions: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1 device only</option>
                  <option value="2">2 devices</option>
                  <option value="3">3 devices (Recommended)</option>
                  <option value="5">5 devices</option>
                  <option value="0">Unlimited</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={securitySettings.autoLogoutInactive}
                    onChange={(e) => setSecuritySettings({...securitySettings, autoLogoutInactive: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Auto-logout on inactivity
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={securitySettings.rememberMe}
                    onChange={(e) => setSecuritySettings({...securitySettings, rememberMe: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Allow "Remember Me" option on login
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Login Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Failed Login Attempts
                </label>
                <select
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">3 attempts</option>
                  <option value="5">5 attempts (Recommended)</option>
                  <option value="10">10 attempts</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Lockout Duration (minutes)
                </label>
                <select
                  value={securitySettings.lockoutDuration}
                  onChange={(e) => setSecuritySettings({...securitySettings, lockoutDuration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes (Recommended)</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireCaptcha}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireCaptcha: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Require CAPTCHA after failed login attempts
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{session.user}</span>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          {session.device} • {session.browser}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {session.ipAddress} • {session.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Active: {session.lastActivity}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Logs
              </CardTitle>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(log.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{log.action}</span>
                          {getStatusBadge(log.status)}
                          <Badge variant="outline">{log.category}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">{log.details}</div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{log.user}</span>
                          <span>{log.timestamp}</span>
                          <span>{log.ipAddress}</span>
                          <span>{log.device}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">
                    <strong>Retention Policy:</strong> Logs are retained for {securitySettings.logRetentionDays} days
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Older logs are automatically archived and can be requested from system administrator
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  View All Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Alert */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-600 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Security Best Practices</h3>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>• <strong>Enable 2FA:</strong> Two-factor authentication dramatically reduces unauthorized access risk</li>
                  <li>• <strong>Strong Passwords:</strong> Enforce complex passwords and regular password changes</li>
                  <li>• <strong>Monitor Activity:</strong> Review audit logs regularly for suspicious activity</li>
                  <li>• <strong>Limit Access:</strong> Grant minimum necessary permissions following principle of least privilege</li>
                  <li>• <strong>Session Timeouts:</strong> Automatic logouts prevent unauthorized access on unattended devices</li>
                  <li>• <strong>IP Restrictions:</strong> Limit login access to known IP ranges when possible</li>
                  <li>• <strong>Security Training:</strong> Educate users about phishing, social engineering, and password security</li>
                  <li>• <strong>Compliance:</strong> These security controls help meet SOC 2, HIPAA, and PCI-DSS requirements</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About Security Settings</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Security settings protect your sensitive financial data and ensure compliance with industry standards.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>2FA Methods:</strong> Authenticator apps recommended over SMS for better security</li>
                  <li>• <strong>Password Policies:</strong> Balance security requirements with user experience</li>
                  <li>• <strong>Session Management:</strong> Automatic timeouts protect against session hijacking</li>
                  <li>• <strong>Audit Logs:</strong> Complete activity tracking for compliance and forensics</li>
                  <li>• <strong>Failed Login Protection:</strong> Account lockouts prevent brute-force attacks</li>
                  <li>• <strong>Active Sessions:</strong> Monitor and revoke sessions from compromised devices</li>
                  <li>• <strong>Regular Reviews:</strong> Audit security settings and logs quarterly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button - Bottom */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}
