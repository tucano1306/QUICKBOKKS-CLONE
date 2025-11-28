'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  StickyNote,
  Plus,
  Edit,
  Trash2,
  Calendar,
  CheckSquare,
  Clock,
  User,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Save
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  createdBy: string
  tags: string[]
}

interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  assignedTo: string
  createdAt: string
}

export default function CustomerNotesPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, customerId])

  const loadData = async () => {
    try {
      const [notesRes, tasksRes, customerRes] = await Promise.all([
        fetch(`/api/customers/${customerId}/notes`),
        fetch(`/api/customers/${customerId}/tasks`),
        fetch(`/api/customers/${customerId}`)
      ])
      
      if (notesRes.ok) {
        const notesData = await notesRes.json()
        setNotes(notesData.notes || [])
      }
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData.tasks || [])
      }
      if (customerRes.ok) {
        const customerData = await customerRes.json()
        setCustomerName(customerData.name || customerData.customer?.name || 'Cliente')
      }
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean)

    if (!title || !content) {
      toast.error('Título y contenido son requeridos')
      return
    }

    if (editingNote) {
      // Update existing note
      setNotes(prev => prev.map(note =>
        note.id === editingNote.id
          ? { ...note, title, content, tags, updatedAt: new Date().toISOString() }
          : note
      ))
      toast.success('Nota actualizada')
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        title,
        content,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: session?.user?.name || 'Usuario'
      }
      setNotes(prev => [newNote, ...prev])
      toast.success('Nota creada')
    }

    setShowNoteModal(false)
    setEditingNote(null)
  }

  const handleDeleteNote = (noteId: string) => {
    if (confirm('¿Eliminar esta nota?')) {
      setNotes(prev => prev.filter(n => n.id !== noteId))
      toast.success('Nota eliminada')
    }
  }

  const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const dueDate = formData.get('dueDate') as string
    const priority = formData.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    const assignedTo = formData.get('assignedTo') as string

    if (!title || !dueDate) {
      toast.error('Título y fecha son requeridos')
      return
    }

    if (editingTask) {
      setTasks(prev => prev.map(task =>
        task.id === editingTask.id
          ? { ...task, title, description, dueDate, priority, assignedTo }
          : task
      ))
      toast.success('Tarea actualizada')
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        title,
        description,
        dueDate,
        priority,
        status: 'PENDING',
        assignedTo,
        createdAt: new Date().toISOString()
      }
      setTasks(prev => [newTask, ...prev])
      toast.success('Tarea creada')
    }

    setShowTaskModal(false)
    setEditingTask(null)
  }

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? {
            ...task,
            status: task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
          }
        : task
    ))
    toast.success('Estado actualizado')
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Tarea eliminada')
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || colors.MEDIUM
  }

  const getPriorityLabel = (priority: string) => {
    const labels = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
      URGENT: 'Urgente'
    }
    return labels[priority as keyof typeof labels] || priority
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notas y Seguimiento</h1>
              <p className="text-gray-600 mt-1">
                Cliente: <span className="font-semibold">{customerName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Notas</p>
                  <p className="text-2xl font-bold">{notes.length}</p>
                </div>
                <StickyNote className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tareas Pendientes</p>
                  <p className="text-2xl font-bold">
                    {tasks.filter(t => t.status !== 'COMPLETED').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completadas</p>
                  <p className="text-2xl font-bold">
                    {tasks.filter(t => t.status === 'COMPLETED').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Urgentes</p>
                  <p className="text-2xl font-bold">
                    {tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                placeholder="Buscar notas o tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={() => setShowNoteModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Nota
              </Button>
              <Button onClick={() => setShowTaskModal(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-yellow-600" />
                Notas ({filteredNotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {!Array.isArray(filteredNotes) || filteredNotes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay notas registradas
                  </p>
                ) : (
                  filteredNotes.map(note => (
                    <div key={note.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{note.title}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNote(note)
                              setShowNoteModal(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{note.content}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {Array.isArray(note.tags) && note.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {note.createdBy}
                        </div>
                        <div>
                          {format(new Date(note.createdAt), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </div>
                      </div>
                      {note.updatedAt !== note.createdAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Editado: {format(new Date(note.updatedAt), "dd MMM yyyy HH:mm", { locale: es })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                Tareas y Seguimiento ({filteredTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {!Array.isArray(filteredTasks) || filteredTasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay tareas registradas
                  </p>
                ) : (
                  filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-4 border rounded-lg ${
                        task.status === 'COMPLETED'
                          ? 'bg-gray-50 border-gray-300'
                          : 'border-gray-200 hover:shadow-md'
                      } transition-shadow`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={task.status === 'COMPLETED'}
                            onChange={() => handleToggleTaskStatus(task.id)}
                            className="mt-1 h-5 w-5 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <h3
                              className={`font-semibold ${
                                task.status === 'COMPLETED'
                                  ? 'line-through text-gray-500'
                                  : ''
                              }`}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTask(task)
                              setShowTaskModal(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 ml-8">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.dueDate), 'dd MMM yyyy', { locale: es })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <User className="h-3 w-3" />
                          {task.assignedTo}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingNote ? 'Editar Nota' : 'Nueva Nota'}
            </h3>
            <form onSubmit={handleSaveNote}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título *</label>
                  <Input
                    name="title"
                    defaultValue={editingNote?.title}
                    required
                    placeholder="Título de la nota"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contenido *</label>
                  <textarea
                    name="content"
                    defaultValue={editingNote?.content}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Escribe el contenido de la nota..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Etiquetas (separadas por comas)
                  </label>
                  <Input
                    name="tags"
                    defaultValue={editingNote?.tags.join(', ')}
                    placeholder="reunion, propuesta, urgente"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingNote ? 'Actualizar' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNoteModal(false)
                    setEditingNote(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </h3>
            <form onSubmit={handleSaveTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título *</label>
                  <Input
                    name="title"
                    defaultValue={editingTask?.title}
                    required
                    placeholder="Título de la tarea"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea
                    name="description"
                    defaultValue={editingTask?.description}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Descripción detallada..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de vencimiento *</label>
                    <Input
                      name="dueDate"
                      type="date"
                      defaultValue={editingTask?.dueDate}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prioridad *</label>
                    <select
                      name="priority"
                      defaultValue={editingTask?.priority || 'MEDIUM'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Asignado a *</label>
                  <Input
                    name="assignedTo"
                    defaultValue={editingTask?.assignedTo || session?.user?.name}
                    required
                    placeholder="Nombre del responsable"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingTask ? 'Actualizar' : 'Crear Tarea'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
