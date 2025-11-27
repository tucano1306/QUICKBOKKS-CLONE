'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users,
  UserPlus,
  Shield,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: 'Active' | 'Inactive' | 'Pending'
  lastLogin: string
  joinedDate: string
  permissions: string[]
  phone?: string
  title?: string
}

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  permissions: {
    category: string
    actions: string[]
  }[]
}

export default function UsersSettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'users' | 'roles'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('All')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadData = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`/api/settings/users?companyId=${activeCompany.id}`),
        fetch(`/api/settings/roles?companyId=${activeCompany.id}`)
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData)
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        // Format roles to match expected structure
        const formattedRoles = rolesData.map((role: Record<string, unknown>) => ({
          ...role,
          permissions: Array.isArray(role.permissions) 
            ? role.permissions.map((p: string) => ({
                category: p,
                actions: ['View', 'Create', 'Edit', 'Delete']
              }))
            : []
        }))
        setRoles(formattedRoles)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadData()
    }
  }, [status, activeCompany, loadData])

  const filteredUsers = users
    .filter(user => selectedRole === 'All' || user.role === selectedRole)
    .filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'Active').length,
    pendingUsers: users.filter(u => u.status === 'Pending').length,
    totalRoles: roles.length
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>
      case 'Inactive':
        return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'Inactive':
        return <XCircle className="w-5 h-5 text-gray-600" />
      case 'Pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return null
    }
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
              <Users className="w-8 h-8 text-blue-600" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage users, roles, and permissions
            </p>
          </div>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalUsers}
              </div>
              <div className="text-sm text-blue-700">Total Users</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.activeUsers}
              </div>
              <div className="text-sm text-green-700">Active Users</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {stats.pendingUsers}
              </div>
              <div className="text-sm text-yellow-700">Pending Invites</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.totalRoles}
              </div>
              <div className="text-sm text-purple-700">Roles Configured</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setSelectedTab('users')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              selectedTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setSelectedTab('roles')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              selectedTab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Roles & Permissions
          </button>
        </div>

        {/* Users Tab */}
        {selectedTab === 'users' && (
          <>
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or department..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Role:</span>
                    <div className="flex gap-1">
                      {['All', ...roles.map(r => r.name)].map(role => (
                        <button
                          key={role}
                          onClick={() => setSelectedRole(role)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedRole === role
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                            {getStatusBadge(user.status)}
                            <Badge variant="outline">{user.role}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {user.email}
                            </div>
                            {user.title && (
                              <div className="flex items-center gap-1">
                                <Shield className="w-4 h-4" />
                                {user.title} • {user.department}
                              </div>
                            )}
                            {user.status === 'Active' && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Last login: {user.lastLogin}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {user.status === 'Active' && (
                          <Button size="sm" variant="outline">
                            <Key className="w-4 h-4 mr-1" />
                            Reset Password
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Permissions Preview */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-gray-600" />
                        <span className="text-xs font-semibold text-gray-700">PERMISSIONS</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.length > 0 ? (
                          user.permissions.map((perm, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Roles Tab */}
        {selectedTab === 'roles' && (
          <>
            <div className="flex justify-end">
              <Button>
                <Shield className="w-4 h-4 mr-2" />
                Create Custom Role
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {roles.map((role) => (
                <Card key={role.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          {role.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-2">{role.description}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="font-semibold text-sm text-gray-700 mb-2">Permissions:</div>
                      {role.permissions.map((perm, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-sm text-gray-900 mb-2">{perm.category}</div>
                          <div className="flex flex-wrap gap-1">
                            {perm.actions.map((action, aidx) => (
                              <Badge key={aidx} variant="outline" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Role
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-4 h-4 mr-1" />
                        View Users
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Security Notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-600 rounded-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Security Best Practices</h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• <strong>Principle of Least Privilege:</strong> Grant users only the permissions they need to perform their job</li>
                  <li>• <strong>Regular Audits:</strong> Review user access and permissions quarterly to ensure appropriateness</li>
                  <li>• <strong>Segregation of Duties:</strong> Separate critical functions (e.g., approval and payment processing)</li>
                  <li>• <strong>Deactivate Promptly:</strong> Disable accounts immediately when employees leave the company</li>
                  <li>• <strong>Strong Passwords:</strong> Enforce password complexity requirements and regular changes</li>
                  <li>• <strong>Two-Factor Authentication:</strong> Require 2FA for users with financial access</li>
                  <li>• <strong>Audit Trail:</strong> All user actions are logged and available in the Security settings</li>
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
                <h3 className="font-semibold text-blue-900 mb-2">About User Management</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Control who has access to your company data and what they can do with role-based permissions.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Roles:</strong> Pre-configured permission sets for common job functions</li>
                  <li>• <strong>Custom Roles:</strong> Create custom roles tailored to your organizational structure</li>
                  <li>• <strong>Granular Permissions:</strong> Control access at the feature and action level (view, create, edit, delete)</li>
                  <li>• <strong>User Invites:</strong> Send email invitations for new users to set up their accounts</li>
                  <li>• <strong>Pending Status:</strong> Users appear as "Pending" until they accept invitation and set password</li>
                  <li>• <strong>Activity Tracking:</strong> Monitor user login times and activity in audit logs</li>
                  <li>• <strong>Multi-Company:</strong> Users can have different roles in different company entities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}
