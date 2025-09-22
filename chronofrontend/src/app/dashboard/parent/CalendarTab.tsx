'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Users,
  Star,
  Filter,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Save,
  X,
  Loader2,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Shield,
  Zap,
  Target,
  Award,
  Trophy,
  Medal,
  Crown,
  Gem,
  Diamond,
  Star as StarIcon,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Umbrella,
  Rainbow,
  Snowflake,
  Flame,
  Droplets,
  Leaf,
  TreePine,
  BookOpen
} from 'lucide-react';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  level: string;
  avatar?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: 'academic' | 'sports' | 'cultural' | 'social' | 'other';
  location: string;
  participants: string[];
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  reminders: number[];
  attachments: string[];
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarTabProps {
  children: Child[];
}

const CalendarTab: React.FC<CalendarTabProps> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  // Mock data for events
  useEffect(() => {
    const mockEvents: Event[] = [
      {
        id: '1',
        title: 'Réunion parents-professeurs',
        description: 'Réunion trimestrielle pour discuter du progrès des élèves',
        date: '2025-01-15',
        time: '14:00',
        duration: 60,
        type: 'academic',
        location: 'Salle de conférence A',
        participants: ['Marie Dupont', 'Jean Martin'],
        isRecurring: false,
        priority: 'high',
        status: 'scheduled',
        reminders: [24, 2],
        attachments: [],
        notes: 'Préparer les bulletins de notes',
        createdBy: 'admin',
        createdAt: '2025-01-10T10:00:00Z',
        updatedAt: '2025-01-10T10:00:00Z'
      },
      {
        id: '2',
        title: 'Sortie éducative - Musée',
        description: 'Visite du musée d\'histoire naturelle avec la classe de 6ème',
        date: '2025-01-20',
        time: '09:00',
        duration: 180,
        type: 'cultural',
        location: 'Musée d\'histoire naturelle',
        participants: ['Classe 6ème A', 'Prof. Dubois'],
        isRecurring: false,
        priority: 'medium',
        status: 'scheduled',
        reminders: [48, 24],
        attachments: ['autorisation_sortie.pdf'],
        notes: 'Penser à prendre les autorisations parentales',
        createdBy: 'teacher',
        createdAt: '2025-01-12T14:30:00Z',
        updatedAt: '2025-01-12T14:30:00Z'
      },
      {
        id: '3',
        title: 'Tournoi de football',
        description: 'Tournoi inter-classes de football',
        date: '2025-01-25',
        time: '15:30',
        duration: 120,
        type: 'sports',
        location: 'Terrain de sport',
        participants: ['Équipes de football'],
        isRecurring: false,
        priority: 'low',
        status: 'scheduled',
        reminders: [24],
        attachments: [],
        notes: 'Prévoir les équipements sportifs',
        createdBy: 'sports_teacher',
        createdAt: '2025-01-14T16:00:00Z',
        updatedAt: '2025-01-14T16:00:00Z'
      }
    ];
    setEvents(mockEvents);
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotifications({ type, message });
    setTimeout(() => setNotifications(null), 5000);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    // This ensures proper alignment with the day names header
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add empty cells to complete the last row if needed
    const totalCells = days.length;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        days.push(null);
      }
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <img src="/images/chrono_carto_logo.png" alt="Chrono-Carto" className="w-4 h-4" />;
      case 'sports':
        return <Zap className="w-4 h-4" />;
      case 'cultural':
        return <Award className="w-4 h-4" />;
      case 'social':
        return <Users className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'bg-blue-500';
      case 'sports':
        return 'bg-green-500';
      case 'cultural':
        return 'bg-purple-500';
      case 'social':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-500';
      case 'in-progress':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventDetails(false);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white">Calendrier</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvel événement</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher des événements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            <option value="academic">Académique</option>
            <option value="sports">Sport</option>
            <option value="cultural">Culturel</option>
            <option value="social">Social</option>
            <option value="other">Autre</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'day' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Jour
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h3 className="text-2xl font-bold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-white font-semibold py-3 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-28 border border-white/10 rounded-lg"></div>;
            }

            const dayEvents = getEventsForDate(day);
            const isCurrentDay = isToday(day);
            const isSelectedDay = isSelected(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`h-28 p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                  isCurrentDay 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg' 
                    : isSelectedDay
                    ? 'bg-blue-500/50 text-white border-blue-300'
                    : 'hover:bg-white/10 text-white border-white/20 hover:border-white/40'
                }`}
              >
                <div className="relative h-full">
                  {/* Numéro centré */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                    <span className={`text-sm font-bold ${
                      isCurrentDay ? 'text-white' : 'text-white'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                  
                  {/* Compteur d'événements en haut à droite */}
                  {dayEvents.length > 0 && (
                    <div className="absolute top-1 right-1">
                      <span className="text-xs bg-white/20 rounded-full px-2 py-1 min-w-[20px] text-center">
                        {dayEvents.length}
                      </span>
                    </div>
                  )}
                  
                  {/* Zone des événements */}
                  <div className="pt-8 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        className={`text-xs p-1 rounded truncate ${getEventColor(event.type)} text-white hover:opacity-80 transition-opacity`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-white/70">
                        +{dayEvents.length - 2} autres
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
              <button
                onClick={() => setShowEventDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {getEventIcon(selectedEvent.type)}
                <span className="text-lg font-semibold text-gray-700">
                  {formatDate(new Date(selectedEvent.date))} à {formatTime(selectedEvent.time)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{selectedEvent.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{selectedEvent.duration} min</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Priorité:</span>
                  <span className={`text-sm font-semibold ${getPriorityColor(selectedEvent.priority)}`}>
                    {selectedEvent.priority}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Statut:</span>
                  <span className={`text-sm font-semibold ${getStatusColor(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedEvent.description}</p>
              </div>

              {selectedEvent.participants.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.participants.map((participant, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-700">{selectedEvent.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <button
                  onClick={() => setShowEventDetails(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifications && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`p-4 rounded-lg shadow-lg ${
            notifications.type === 'success' ? 'bg-green-500' :
            notifications.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white`}>
            {notifications.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTab;

