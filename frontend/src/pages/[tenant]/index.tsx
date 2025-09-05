// src/pages/[tenant]/index.tsx
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Spinner from '@/components/Spinner'

// Types
interface Contact {
  id: number
  name: string
  email: string
  phone?: string
  company?: string
}

interface Task {
  id: number
  title: string
  description?: string
  assignee_id?: number
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  created_at: string
  updated_at: string
}

interface Message {
  id: number
  content: string
  sender_id: number
  recipient_id?: number
  channel: string
  thread_id?: number
  message_type: string
  is_read: boolean
  created_at: string
  sender: Contact
  recipient?: Contact
}

interface Channel {
  channel: string
  message_count: number
  unread_count: number
  last_message?: Message
}

interface Document {
  id: number
  name: string
  file_size: number
  mime_type: string
  folder_id?: number
  is_public: boolean
  download_count: number
  created_at: string
  uploader: Contact
}

interface Folder {
  id: number
  name: string
  description?: string
  parent_id?: number
  is_shared: boolean
  created_at: string
  creator: Contact
}

interface FolderContents {
  folders: Folder[]
  documents: Document[]
  total_items: number
}

interface Event {
  id: number
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  event_type: 'meeting' | 'task_deadline' | 'holiday' | 'appointment' | 'reminder'
  is_all_day: boolean
  created_at: string
  created_by: number
  participants: EventParticipant[]
}

interface EventParticipant {
  id: number
  event_id: number
  contact_id: number
  contact: Contact
}

interface CalendarStats {
  total_events: number
  upcoming_events: number
  events_this_week: number
  events_this_month: number
}

interface ProjectMember {
  id: number
  project_id: number
  contact_id: number
  role: string
  joined_at: string
  hourly_rate?: number
  contact: Contact
}

interface Project {
  id: number
  name: string
  description?: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date?: string
  end_date?: string
  deadline?: string
  budget?: number
  estimated_hours?: number
  created_by: number
  client_id?: number
  is_public: boolean
  is_archived: boolean
  color: string
  created_at: string
  updated_at: string
  creator: Contact
  client?: Contact
  members: ProjectMember[]
  tasks?: Task[]
  documents?: Document[]
  events?: Event[]
  task_count?: number
  completed_task_count?: number
  document_count?: number
  event_count?: number
}

interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  overdue_projects: number
  projects_by_status: Record<string, number>
  projects_by_priority: Record<string, number>
}

type TabType = 'contacts' | 'tasks' | 'messages' | 'documents' | 'calendar' | 'projects'

export default function TenantDashboard() {
  const router = useRouter()
  const { tenant } = router.query as { tenant: string }
  
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('contacts')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [folderContents, setFolderContents] = useState<FolderContents | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [calendarStats, setCalendarStats] = useState<CalendarStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null)
  const [activeChannel, setActiveChannel] = useState('general')
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Form states
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '' })
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    assignee_id: '', 
    priority: 'medium' as const,
    status: 'todo' as const 
  })
  const [newFolder, setNewFolder] = useState({ name: '', description: '' })
  const [newMessage, setNewMessage] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'meeting' as const,
    is_all_day: false,
    participant_ids: [] as number[]
  })
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'planning' as const,
    priority: 'medium' as const,
    created_by: 0,
    client_id: '',
    budget: '',
    estimated_hours: '',
    start_date: '',
    end_date: '',
    deadline: '',
    member_ids: [] as number[],
    color: '#3B82F6',
    is_public: false
  })

  const API_URL = 'http://localhost:8000'

  useEffect(() => {
    if (tenant) {
      fetchData()
    }
  }, [tenant])

  const fetchData = async () => {
    try {
      // Fetch de base qui devrait toujours fonctionner
      const [contactsRes, tasksRes, channelsRes, documentsRes, foldersRes, eventsRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/${tenant}/contacts`),
        fetch(`${API_URL}/api/${tenant}/tasks`),
        fetch(`${API_URL}/api/${tenant}/messages/channels`),
        fetch(`${API_URL}/api/${tenant}/documents`),
        fetch(`${API_URL}/api/${tenant}/folders`),
        fetch(`${API_URL}/api/${tenant}/events`),
        fetch(`${API_URL}/api/${tenant}/projects`)
      ])
      
      // Parse des données de base
      const contactsData = await contactsRes.json()
      const tasksData = await tasksRes.json()
      const channelsData = await channelsRes.json()
      const documentsData = await documentsRes.json()
      const foldersData = await foldersRes.json()
      const eventsData = await eventsRes.json()
      const projectsData = await projectsRes.json()
      
      setContacts(contactsData)
      setTasks(tasksData)
      setChannels(channelsData)
      setDocuments(documentsData)
      setFolders(foldersData)
      setEvents(eventsData)
      setProjects(projectsData)
      
      // Fetch des stats séparément avec gestion d'erreur
      try {
        const eventsStatsRes = await fetch(`${API_URL}/api/${tenant}/events/stats`)
        if (eventsStatsRes.ok) {
          const statsData = await eventsStatsRes.json()
          setCalendarStats(statsData)
        } else {
          console.log('Events stats endpoint not available')
          // Calculer les stats manuellement si l'endpoint n'existe pas
          const now = new Date()
          const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          
          setCalendarStats({
            total_events: eventsData.length,
            upcoming_events: eventsData.filter((e: Event) => new Date(e.start_time) > now).length,
            events_this_week: eventsData.filter((e: Event) => {
              const eventDate = new Date(e.start_time)
              return eventDate >= weekStart && eventDate < weekEnd
            }).length,
            events_this_month: eventsData.filter((e: Event) => {
              const eventDate = new Date(e.start_time)
              return eventDate >= monthStart && eventDate <= monthEnd
            }).length
          })
        }
      } catch (error) {
        console.log('Error fetching events stats:', error)
      }
      
      // Fetch des stats projets séparément
      try {
        const projectStatsRes = await fetch(`${API_URL}/api/${tenant}/projects/stats`)
        if (projectStatsRes.ok) {
          const projectStatsData = await projectStatsRes.json()
          setProjectStats(projectStatsData)
        } else {
          console.log('Projects stats endpoint not available')
          // Calculer les stats manuellement si l'endpoint n'existe pas
          const now = new Date()
          setProjectStats({
            total_projects: projectsData.length,
            active_projects: projectsData.filter((p: Project) => p.status === 'active').length,
            completed_projects: projectsData.filter((p: Project) => p.status === 'completed').length,
            overdue_projects: projectsData.filter((p: Project) => 
              p.deadline && new Date(p.deadline) < now && p.status !== 'completed'
            ).length,
            projects_by_status: projectsData.reduce((acc: any, p: Project) => {
              acc[p.status] = (acc[p.status] || 0) + 1
              return acc
            }, {}),
            projects_by_priority: projectsData.reduce((acc: any, p: Project) => {
              acc[p.priority] = (acc[p.priority] || 0) + 1
              return acc
            }, {})
          })
        }
      } catch (error) {
        console.log('Error fetching projects stats:', error)
      }
      
      // Charger les messages du channel actif
      if (channelsData.length > 0) {
        await fetchMessages(activeChannel)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (channel: string) => {
    try {
      const res = await fetch(`${API_URL}/api/${tenant}/messages?channel=${channel}&limit=50`)
      const messagesData = await res.json()
      setMessages(messagesData.reverse()) // Plus ancien en premier
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const fetchFolderContents = async (folderId: number | null) => {
    try {
      const url = folderId 
        ? `${API_URL}/api/${tenant}/folders/${folderId}/contents`
        : `${API_URL}/api/${tenant}/documents/root`
      const res = await fetch(url)
      const data = await res.json()
      setFolderContents(data)
    } catch (error) {
      console.error('Error loading folder contents:', error)
    }
  }

  const navigateToFolder = async (folderId: number | null) => {
    setCurrentFolder(folderId)
    await fetchFolderContents(folderId)
  }

  const createContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const res = await fetch(`${API_URL}/api/${tenant}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      })
      
      if (res.ok) {
        setNewContact({ name: '', email: '', phone: '', company: '' })
        setIsAddingContact(false)
        await fetchData()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setCreating(false)
    }
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const taskData = {
        ...newTask,
        assignee_id: newTask.assignee_id ? parseInt(newTask.assignee_id) : null
      }
      
      const res = await fetch(`${API_URL}/api/${tenant}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      
      if (res.ok) {
        setNewTask({ title: '', description: '', assignee_id: '', priority: 'medium', status: 'todo' })
        setIsAddingTask(false)
        await fetchData()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setCreating(false)
    }
  }

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const folderData = {
        ...newFolder,
        parent_id: currentFolder,
        created_by: contacts.length > 0 ? contacts[0].id : null
      }
      
      const res = await fetch(`${API_URL}/api/${tenant}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      })
      
      if (res.ok) {
        setNewFolder({ name: '', description: '' })
        setIsAddingFolder(false)
        await fetchData()
        await fetchFolderContents(currentFolder)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setCreating(false)
    }
  }

  const uploadFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('uploaded_by', contacts.length > 0 ? contacts[0].id.toString() : '1')
      if (currentFolder) {
        formData.append('folder_id', currentFolder.toString())
      }
      
      const res = await fetch(`${API_URL}/api/${tenant}/documents/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        setSelectedFile(null)
        await fetchData()
        await fetchFolderContents(currentFolder)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUploading(false)
    }
  }

  const createMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    
    setCreating(true)
    
    try {
      // Obtenir un sender_id (premier contact pour simplifier)
      const senderId = contacts.length > 0 ? contacts[0].id : null
      if (!senderId) {
        alert('Créez d\'abord un contact pour envoyer des messages')
        return
      }
      
      const messageData = {
        content: newMessage,
        sender_id: senderId,
        channel: activeChannel,
        recipient_id: selectedRecipient ? parseInt(selectedRecipient) : null
      }
      
      const res = await fetch(`${API_URL}/api/${tenant}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      })
      
      if (res.ok) {
        setNewMessage('')
        setSelectedRecipient('')
        await fetchMessages(activeChannel)
        await fetchData() // Reload channels pour mettre à jour les compteurs
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setCreating(false)
    }
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const eventData = {
        ...newEvent,
        created_by: contacts.length > 0 ? contacts[0].id : null
      }
      
      if (!eventData.created_by) {
        alert('Créez d\'abord un contact pour créer des événements')
        return
      }
      
      const res = await fetch(`${API_URL}/api/${tenant}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (res.ok) {
        setNewEvent({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          location: '',
          event_type: 'meeting',
          is_all_day: false,
          participant_ids: []
        })
        setIsAddingEvent(false)
        await fetchData()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setCreating(false)
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      if (contacts.length === 0) {
        alert('Veuillez créer au moins un contact avant de créer un projet')
        setCreating(false)
        return
      }
      
      const creatorId = contacts[0].id
      
      const projectData = {
        name: newProject.name,
        description: newProject.description || null,
        status: newProject.status,
        priority: newProject.priority,
        created_by: creatorId,
        client_id: newProject.client_id ? parseInt(newProject.client_id) : null,
        budget: newProject.budget ? parseFloat(newProject.budget) : null,
        estimated_hours: newProject.estimated_hours ? parseInt(newProject.estimated_hours) : null,
        start_date: newProject.start_date || null,
        end_date: newProject.end_date || null,
        deadline: newProject.deadline || null,
        color: newProject.color,
        is_public: newProject.is_public,
        member_ids: newProject.member_ids
      }
      
      console.log('Creating project with data:', projectData)
      
      const res = await fetch(`${API_URL}/api/${tenant}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })
      
      if (!res.ok) {
        const error = await res.json()
        console.error('Project creation error:', error)
        let errorMessage = 'Erreur lors de la création du projet:\n'
        
        if (error.detail) {
          if (Array.isArray(error.detail)) {
            errorMessage += error.detail.map((err: any) => {
              if (err.msg) {
                return `- ${err.loc?.join(' > ') || 'Champ'}: ${err.msg}`
              }
              return `- ${JSON.stringify(err)}`
            }).join('\n')
          } else if (typeof error.detail === 'string') {
            errorMessage += error.detail
          } else {
            errorMessage += JSON.stringify(error.detail)
          }
        } else {
          errorMessage += 'Erreur inconnue'
        }
        
        alert(errorMessage)
        setCreating(false)
        return
      }
      
      // Reset form
      setNewProject({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        created_by: 0,
        client_id: '',
        budget: '',
        estimated_hours: '',
        start_date: '',
        end_date: '',
        deadline: '',
        member_ids: [],
        color: '#3B82F6',
        is_public: false
      })
      setIsAddingProject(false)
      await fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Une erreur est survenue lors de la création du projet')
    } finally {
      setCreating(false)
    }
  }

  const formatEventTime = (dateString: string, isAllDay: boolean) => {
    const date = new Date(dateString)
    if (isAllDay) {
      return 'Toute la journée'
    }
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-100 text-blue-800'
      case 'task_deadline': return 'bg-red-100 text-red-800'
      case 'holiday': return 'bg-green-100 text-green-800'
      case 'appointment': return 'bg-purple-100 text-purple-800'
      case 'reminder': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'meeting': return '👥'
      case 'task_deadline': return '⏰'
      case 'holiday': return '🏖️'
      case 'appointment': return '📅'
      case 'reminder': return '🔔'
      default: return '📋'
    }
  }

  const getUpcomingEvents = () => {
    const now = new Date()
    return events
      .filter(event => new Date(event.start_time) >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5)
  }

  const downloadDocument = async (documentId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/${tenant}/documents/${documentId}/download`)
      if (res.ok) {
        const data = await res.json()
        // Open the download URL in a new tab
        window.open(data.download_url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const switchChannel = async (channel: string) => {
    setActiveChannel(channel)
    await fetchMessages(channel)
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel')) return '📊'
    if (mimeType.includes('powerpoint')) return '📊'
    if (mimeType.includes('json')) return '📋'
    if (mimeType.includes('text')) return '📄'
    return '📎'
  }

  const getContactName = (assigneeId: number) => {
    const contact = contacts.find(c => c.id === assigneeId)
    return contact ? contact.name : 'Non assigné'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'todo': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProjectPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProjectStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planification'
      case 'active': return 'Actif'
      case 'on_hold': return 'En pause'
      case 'completed': return 'Terminé'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  const getProjectPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'Faible'
      case 'medium': return 'Moyenne'
      case 'high': return 'Haute'
      case 'critical': return 'Critique'
      default: return priority
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 capitalize">{tenant}</h1>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'contacts'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Contacts ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'tasks'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tâches ({tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Messages
                {channels.reduce((sum, ch) => sum + ch.unread_count, 0) > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {channels.reduce((sum, ch) => sum + ch.unread_count, 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Documents ({documents.length})
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Calendrier ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'projects'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Projets ({projects.length})
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => {
                if (activeTab === 'contacts') setIsAddingContact(!isAddingContact)
                else if (activeTab === 'tasks') setIsAddingTask(!isAddingTask)
                else if (activeTab === 'documents') setIsAddingFolder(!isAddingFolder)
                else if (activeTab === 'calendar') setIsAddingEvent(!isAddingEvent)
                else if (activeTab === 'projects') setIsAddingProject(!isAddingProject)
                // Messages n'ont pas de bouton "ajouter" global
              }}
              disabled={creating || activeTab === 'messages'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'messages' ? 'invisible' : ''
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {activeTab === 'contacts' ? 'Nouveau contact' : 
               activeTab === 'tasks' ? 'Nouvelle tâche' : 
               activeTab === 'documents' ? 'Nouveau dossier' :
               activeTab === 'calendar' ? 'Nouvel événement' : 
               activeTab === 'projects' ? 'Nouveau projet' : ''}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <>
            {/* Add Contact Form */}
            {isAddingContact && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Nouveau contact</h2>
                <form onSubmit={createContact} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={creating}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={creating}
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    />
                    <input
                      type="text"
                      placeholder="Entreprise"
                      value={newContact.company}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingContact(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      disabled={creating}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">Création...</span>
                        </>
                      ) : (
                        'Créer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Contacts List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  Contacts
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({contacts.length})
                  </span>
                </h2>
              </div>
              
              {contacts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun contact</h3>
                  <p className="mt-1 text-sm text-gray-500">Commencez par créer votre premier contact.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {contacts.map(contact => (
                    <div key={contact.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium text-sm">
                              {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.email}</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact.company || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <>
            {/* Add Task Form */}
            {isAddingTask && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Nouvelle tâche</h2>
                <form onSubmit={createTask} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      placeholder="Titre de la tâche"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={creating}
                    />
                    <textarea
                      placeholder="Description (optionnel)"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                      disabled={creating}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={newTask.assignee_id}
                        onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={creating}
                      >
                        <option value="">Non assigné</option>
                        {contacts.map(contact => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={creating}
                      >
                        <option value="low">Priorité faible</option>
                        <option value="medium">Priorité moyenne</option>
                        <option value="high">Priorité haute</option>
                      </select>
                      <select
                        value={newTask.status}
                        onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={creating}
                      >
                        <option value="todo">À faire</option>
                        <option value="in_progress">En cours</option>
                        <option value="done">Terminé</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      disabled={creating}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">Création...</span>
                        </>
                      ) : (
                        'Créer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tasks List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  Tâches
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({tasks.length})
                  </span>
                </h2>
              </div>
              
              {tasks.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune tâche</h3>
                  <p className="mt-1 text-sm text-gray-500">Commencez par créer votre première tâche.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {tasks.map(task => (
                    <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                            <div className="flex space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Faible'}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                {task.status === 'done' ? 'Terminé' : task.status === 'in_progress' ? 'En cours' : 'À faire'}
                              </span>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Assigné à: {task.assignee_id ? getContactName(task.assignee_id) : 'Non assigné'}</span>
                            <span>Créé le {new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
            {/* Sidebar Channels */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Channels</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {channels.map(channel => (
                  <button
                    key={channel.channel}
                    onClick={() => switchChannel(channel.channel)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      activeChannel === channel.channel ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">
                          {channel.channel === 'general' ? '📢' : 
                           channel.channel === 'private' ? '🔒' : '💬'}
                        </span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {channel.channel}
                        </span>
                      </div>
                      {channel.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {channel.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {channel.message_count} message{channel.message_count > 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 flex flex-col">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 capitalize flex items-center">
                      <span className="mr-2">
                        {activeChannel === 'general' ? '📢' : 
                         activeChannel === 'private' ? '🔒' : '💬'}
                      </span>
                      #{activeChannel}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {messages.length} message{messages.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {activeChannel === 'private' && (
                    <select
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1"
                    >
                      <option value="">Message à tous</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          Privé: {contact.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.8-.44l-5.5 1.84a.75.75 0 01-.96-.96L5.58 15.8A8.955 8.955 0 013 13c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun message</h3>
                      <p className="mt-1 text-sm text-gray-500">Commencez la conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map(message => (
                    <div key={message.id} className="flex space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-medium text-xs">
                          {message.sender.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {message.sender.name}
                          </span>
                          {message.recipient && (
                            <span className="text-xs text-gray-500">
                              → {message.recipient.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(message.created_at)}
                          </span>
                          {!message.is_read && (
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-700">
                          {message.content}
                        </div>
                        {message.thread_id && (
                          <div className="mt-1 text-xs text-gray-500">
                            ↳ En réponse à un message
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="px-6 py-4 border-t border-gray-100">
                <form onSubmit={createMessage} className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Message #${activeChannel}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating || !newMessage.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <Spinner size="sm" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <>
            {/* Breadcrumb Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <nav className="flex items-center space-x-2 text-sm">
                  <button
                    onClick={() => navigateToFolder(null)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    Racine
                  </button>
                  {currentFolder && (
                    <>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-700">
                        {folders.find(f => f.id === currentFolder)?.name || 'Dossier'}
                      </span>
                    </>
                  )}
                </nav>
                
                {/* Upload File Button */}
                <div className="flex space-x-2">
                  <label className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSelectedFile(file)
                        }
                      }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              
              {/* Upload Progress */}
              {selectedFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">📎 {selectedFile.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                          uploadFile(fakeEvent)
                        }}
                        disabled={uploading}
                        className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      >
                        {uploading ? 'Upload...' : 'Confirmer'}
                      </button>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                  {uploading && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-primary-600 h-1 rounded-full animate-pulse" style={{width: '45%'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add Folder Form */}
            {isAddingFolder && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Nouveau dossier</h2>
                <form onSubmit={createFolder} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      placeholder="Nom du dossier"
                      value={newFolder.name}
                      onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={creating}
                    />
                    <textarea
                      placeholder="Description (optionnel)"
                      value={newFolder.description}
                      onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={2}
                      disabled={creating}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingFolder(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      disabled={creating}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">Création...</span>
                        </>
                      ) : (
                        'Créer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Documents and Folders List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  {currentFolder ? folders.find(f => f.id === currentFolder)?.name : 'Documents'}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({folderContents ? folderContents.total_items : documents.length + folders.length} éléments)
                  </span>
                </h2>
              </div>
              
              {(!folderContents || folderContents.total_items === 0) && documents.length === 0 && folders.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun document</h3>
                  <p className="mt-1 text-sm text-gray-500">Commencez par créer un dossier ou uploader un fichier.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Folders */}
                  {(folderContents?.folders || folders.filter(f => currentFolder ? f.parent_id === currentFolder : !f.parent_id)).map(folder => (
                    <div key={folder.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => navigateToFolder(folder.id)}
                          className="flex items-center space-x-3 flex-1 text-left"
                        >
                          <div className="flex-shrink-0">
                            <span className="text-2xl">📁</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{folder.name}</div>
                            {folder.description && (
                              <div className="text-sm text-gray-500">{folder.description}</div>
                            )}
                            <div className="text-xs text-gray-400">
                              Créé par {folder.creator.name} le {new Date(folder.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center space-x-2">
                          {folder.is_shared && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              Partagé
                            </span>
                          )}
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Documents */}
                  {(folderContents?.documents || documents.filter(d => currentFolder ? d.folder_id === currentFolder : !d.folder_id)).map(document => (
                    <div key={document.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            <span className="text-xl">{getFileIcon(document.mime_type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{document.name}</div>
                            <div className="text-sm text-gray-500">
                              {formatFileSize(document.file_size)} • {document.mime_type.split('/')[1]?.toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-400">
                              Uploadé par {document.uploader.name} le {new Date(document.created_at).toLocaleDateString()}
                              {document.download_count > 0 && ` • ${document.download_count} téléchargement${document.download_count > 1 ? 's' : ''}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {document.is_public && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              Public
                            </span>
                          )}
                          <button
                            onClick={() => downloadDocument(document.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                            title="Télécharger"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <>
            {/* Add Event Form */}
            {isAddingEvent && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Nouvel événement</h2>
                <form onSubmit={createEvent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Titre de l'événement"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={creating}
                    />
                    <select
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    >
                      <option value="meeting">Réunion</option>
                      <option value="appointment">Rendez-vous</option>
                      <option value="task_deadline">Échéance tâche</option>
                      <option value="reminder">Rappel</option>
                      <option value="holiday">Congé</option>
                    </select>
                  </div>
                  
                  <textarea
                    placeholder="Description (optionnel)"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={2}
                    disabled={creating}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                      <input
                        type="datetime-local"
                        value={newEvent.start_time}
                        onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                      <input
                        type="datetime-local"
                        value={newEvent.end_time}
                        onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        disabled={creating}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Lieu (optionnel)"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_all_day"
                        checked={newEvent.is_all_day}
                        onChange={(e) => setNewEvent({ ...newEvent, is_all_day: e.target.checked })}
                        className="mr-2"
                        disabled={creating}
                      />
                      <label htmlFor="is_all_day" className="text-sm text-gray-700">
                        Toute la journée
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {contacts.map(contact => (
                        <label key={contact.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newEvent.participant_ids.includes(contact.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewEvent({
                                  ...newEvent,
                                  participant_ids: [...newEvent.participant_ids, contact.id]
                                })
                              } else {
                                setNewEvent({
                                  ...newEvent,
                                  participant_ids: newEvent.participant_ids.filter(id => id !== contact.id)
                                })
                              }
                            }}
                            className="mr-2"
                            disabled={creating}
                          />
                          <span className="text-sm text-gray-700">{contact.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingEvent(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      disabled={creating}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">Création...</span>
                        </>
                      ) : (
                        'Créer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Calendar Stats */}
            {calendarStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📅</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Total événements</p>
                      <p className="text-lg font-semibold text-gray-900">{calendarStats.total_events}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-lg">⏰</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">À venir</p>
                      <p className="text-lg font-semibold text-gray-900">{calendarStats.upcoming_events}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 text-lg">📊</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Cette semaine</p>
                      <p className="text-lg font-semibold text-gray-900">{calendarStats.events_this_week}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 text-lg">📆</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Ce mois</p>
                      <p className="text-lg font-semibold text-gray-900">{calendarStats.events_this_month}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Events List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Events */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-medium text-gray-900">Événements à venir</h2>
                </div>
                
                {getUpcomingEvents().length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun événement à venir</h3>
                    <p className="mt-1 text-sm text-gray-500">Créez votre premier événement.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {getUpcomingEvents().map(event => (
                      <div key={event.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <span className="text-lg">{getEventTypeIcon(event.event_type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-sm font-medium text-gray-900 truncate">{event.title}</h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                                {event.event_type === 'meeting' ? 'Réunion' :
                                 event.event_type === 'appointment' ? 'RDV' :
                                 event.event_type === 'task_deadline' ? 'Échéance' :
                                 event.event_type === 'holiday' ? 'Congé' : 'Rappel'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatEventDate(event.start_time)} • {formatEventTime(event.start_time, event.is_all_day)}
                            </div>
                            {event.location && (
                              <div className="text-xs text-gray-400">📍 {event.location}</div>
                            )}
                            {event.participants.length > 0 && (
                              <div className="text-xs text-gray-400">
                                👥 {event.participants.map(p => p.contact.name).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Events */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-medium text-gray-900">
                    Tous les événements
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({events.length})
                    </span>
                  </h2>
                </div>
                
                {events.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun événement</h3>
                    <p className="mt-1 text-sm text-gray-500">Commencez par créer votre premier événement.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {events
                      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                      .map(event => (
                        <div key={event.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <span className="text-sm">{getEventTypeIcon(event.event_type)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-sm font-medium text-gray-900 truncate">{event.title}</h3>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                                  {event.event_type === 'meeting' ? 'Réunion' :
                                   event.event_type === 'appointment' ? 'RDV' :
                                   event.event_type === 'task_deadline' ? 'Échéance' :
                                   event.event_type === 'holiday' ? 'Congé' : 'Rappel'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatEventDate(event.start_time)} • {formatEventTime(event.start_time, event.is_all_day)}
                              </div>
                              {event.location && (
                                <div className="text-xs text-gray-400">📍 {event.location}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <>
            {/* Add Project Form */}
            {isAddingProject && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Nouveau projet</h2>
                <form onSubmit={createProject} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nom du projet"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={creating}
                    />
                    <select
                      value={newProject.client_id}
                      onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    >
                      <option value="">Sélectionner un client</option>
                      {contacts.filter(c => c.company).map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} - {contact.company}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <textarea
                    placeholder="Description du projet"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    disabled={creating}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    >
                      <option value="planning">Planification</option>
                      <option value="active">Actif</option>
                      <option value="on_hold">En pause</option>
                      <option value="completed">Terminé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    >
                      <option value="low">Priorité faible</option>
                      <option value="medium">Priorité moyenne</option>
                      <option value="high">Priorité haute</option>
                      <option value="critical">Priorité critique</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Budget (€)"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    />
                    <input
                      type="number"
                      placeholder="Heures estimées"
                      value={newProject.estimated_hours}
                      onChange={(e) => setNewProject({ ...newProject, estimated_hours: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={creating}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                      <input
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                      <input
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                      <input
                        type="date"
                        value={newProject.deadline}
                        onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={creating}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Membres de l'équipe</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {contacts.map(contact => (
                        <label key={contact.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newProject.member_ids.includes(contact.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewProject({
                                  ...newProject,
                                  member_ids: [...newProject.member_ids, contact.id]
                                })
                              } else {
                                setNewProject({
                                  ...newProject,
                                  member_ids: newProject.member_ids.filter(id => id !== contact.id)
                                })
                              }
                            }}
                            className="mr-2"
                            disabled={creating}
                          />
                          <span className="text-sm text-gray-700">{contact.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <label className="block text-sm font-medium text-gray-700 mr-2">Couleur</label>
                      <input
                        type="color"
                        value={newProject.color}
                        onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                        className="h-8 w-16 border border-gray-300 rounded cursor-pointer"
                        disabled={creating}
                      />
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newProject.is_public}
                        onChange={(e) => setNewProject({ ...newProject, is_public: e.target.checked })}
                        className="mr-2"
                        disabled={creating}
                      />
                      <span className="text-sm text-gray-700">Projet public</span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      disabled={creating}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">Création...</span>
                        </>
                      ) : (
                        'Créer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Projects Stats */}
            {projectStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📊</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Total projets</p>
                      <p className="text-lg font-semibold text-gray-900">{projectStats.total_projects}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-lg">🚀</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Actifs</p>
                      <p className="text-lg font-semibold text-gray-900">{projectStats.active_projects}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-lg">✅</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Terminés</p>
                      <p className="text-lg font-semibold text-gray-900">{projectStats.completed_projects}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 text-lg">⏰</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">En retard</p>
                      <p className="text-lg font-semibold text-gray-900">{projectStats.overdue_projects}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-600 text-lg">⏸️</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">En pause</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {projectStats.projects_by_status?.on_hold || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  Projets
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({projects.length})
                  </span>
                </h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun projet</h3>
                  <p className="mt-1 text-sm text-gray-500">Commencez par créer votre premier projet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {projects.map(project => (
                    <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: project.color }}
                            />
                            <h3 className="text-sm font-medium text-gray-900">{project.name}</h3>
                            <div className="flex space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectStatusColor(project.status)}`}>
                                {getProjectStatusText(project.status)}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectPriorityColor(project.priority)}`}>
                                {getProjectPriorityText(project.priority)}
                              </span>
                            </div>
                            {project.is_public && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Public
                              </span>
                            )}
                          </div>
                          
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Client:</span> {project.client?.name || 'Aucun'}
                            </div>
                            <div>
                              <span className="font-medium">Budget:</span> {project.budget ? `${project.budget}€` : 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Heures:</span> {project.estimated_hours || 'N/A'}
                            </div>
                            {project.deadline && (
                              <div>
                                <span className="font-medium">Deadline:</span> {new Date(project.deadline).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-6 text-xs text-gray-500">
                            <span>Créé par: {project.creator.name}</span>
                            <span>Membres: {project.members.length}</span>
                            {project.task_count !== undefined && (
                              <>
                                <span>Tâches: {project.completed_task_count}/{project.task_count}</span>
                                <span>Documents: {project.document_count}</span>
                                <span>Événements: {project.event_count}</span>
                              </>
                            )}
                          </div>
                          
                          {project.members.length > 0 && (
                            <div className="mt-2 flex -space-x-2">
                              {project.members.slice(0, 5).map(member => (
                                <div 
                                  key={member.id}
                                  className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center border-2 border-white"
                                  title={`${member.contact.name} (${member.role})`}
                                >
                                  <span className="text-primary-700 font-medium text-xs">
                                    {member.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                              ))}
                              {project.members.length > 5 && (
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
                                  <span className="text-gray-600 font-medium text-xs">
                                    +{project.members.length - 5}
                                  </span>
                                </div>
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
          </>
        )}
      </div>
    </div>
  )
}