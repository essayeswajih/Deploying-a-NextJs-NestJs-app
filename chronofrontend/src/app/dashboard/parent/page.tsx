'use client';

import React, { useState, useEffect } from 'react';
import { useParentDashboard } from '@/hooks/useDashboard';
import { parentsAPI } from '../../../lib/api';
import {
  Home,
  TrendingUp,
  FileText,
  MessageSquare,
  Calendar,
  Users,
  CreditCard,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  Menu,
  User,
  ChevronDown,
  LogOut,
  HelpCircle
} from 'lucide-react';

// Import des composants d'onglets
import DashboardOverviewTab from './DashboardOverviewTab';
import ChildrenProgressTab from './ChildrenProgressTab';
import QuizResultsTab from './QuizResultsTab';
import MessagesTab from './MessagesTab';
import CalendarTab from './CalendarTab';
import MeetingsTab from './MeetingsTab';
import PaymentsTab from './PaymentsTab';
import ParentProfileTab from './ParentProfileTab';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  class: string;
  level: string;
  school: string;
  teacher: string;
  stats: {
    averageScore: number;
    totalQuizzes: number;
    completedQuizzes: number;
    currentStreak: number;
    totalXP: number;
    badges: number;
    rank: number;
  };
  recentActivity: {
    lastQuiz: string;
    lastScore: number;
    lastActive: string;
  };
}

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  children: Child[];
  notifications: {
    unread: number;
    urgent: number;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  component: React.ComponentType<any>;
  badge?: number;
}

const ParentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [childSelectorOpen, setChildSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Use the parent dashboard hook
  const {
    children,
    messages,
    conversations,
    loading,
    error,
    loadChildren,
    loadConversations,
    loadMessages,
    loadNotifications,
    sendMessage,
    createConversation,
    logout,
    clearError,
  } = useParentDashboard();

  // Parent data - fetched from API
  const [parent, setParent] = useState<Parent | null>(null);
  
  // État local pour l'enfant sélectionné
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  useEffect(() => {
    loadParentData();
  }, []);

  // Charger les enfants du parent
  const loadParentChildren = async (userId: number) => {
    try {
      console.log('🔍 Chargement des enfants pour le parent ID:', userId);
      
      // Utiliser l'ID de parent correct (même logique que ChildrenProgressTab)
      const correctParentId = userId === 21 ? 39 : userId;
      
      // Utiliser l'API pour récupérer les enfants
      const response = await fetch(`/api/parent/children?parentId=${correctParentId}`);
      
      if (!response.ok) {
        console.warn('⚠️ API non disponible, aucun enfant trouvé');
        return;
      }
      
      const profile = await response.json();
      console.log('✅ Profil parent récupéré:', profile);
      
      if (profile.children && profile.children.length > 0) {
        // Transformer les données des enfants
        const children = profile.children.map((child: any) => ({
          id: child.id.toString(),
          firstName: child.firstName || child.full_name?.split(' ')[0] || '',
          lastName: child.lastName || child.full_name?.split(' ').slice(1).join(' ') || '',
          class: child.classLevel || child.class || '',
          level: 'Terminale',
          school: 'École par défaut',
          teacher: 'Professeur par défaut',
          stats: {
            averageScore: 0,
            totalQuizzes: 0,
            completedQuizzes: 0,
            currentStreak: 0,
            totalXP: 0,
            badges: 0,
            rank: 1
          },
          recentActivity: {
            lastQuiz: 'Aucun quiz',
            lastScore: 0,
            lastActive: new Date().toISOString()
          }
        }));
        
        // Mettre à jour le parent avec les enfants
        setParent(prevParent => {
          if (prevParent) {
            return {
              ...prevParent,
              children: children
            };
          }
          return prevParent;
        });
        
        console.log('✅ Enfants chargés:', children);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des enfants:', error);
    }
  };

  // Sélectionner automatiquement le premier enfant quand les enfants sont chargés
  useEffect(() => {
    console.log('🔍 useEffect selectedChild - parent?.children:', parent?.children);
    console.log('🔍 useEffect selectedChild - selectedChild:', selectedChild);
    
    if (parent?.children && parent.children.length > 0 && !selectedChild) {
      console.log('🔍 Sélection automatique du premier enfant:', parent.children[0]);
      setSelectedChild(parent.children[0].id);
    }
  }, [parent?.children, selectedChild]);

  const loadParentData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user from localStorage
      const userData = localStorage.getItem('userDetails');
      if (!userData) {
        console.error('No user data found in localStorage');
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('Loading parent data for user:', user);
      
      // Fetch parent data from API
      const parentData = await parentsAPI.getParentByUserId(user.id);
      console.log('Fetched parent data:', parentData);
      
      if (parentData) {
        // Transform API data to match our Parent interface
        const transformedParent: Parent = {
          id: parentData.id.toString(),
          firstName: parentData.firstName,
          lastName: parentData.lastName,
          email: parentData.email,
          phone: parentData.phone || '',
          avatar: '/avatars/parent-default.jpg', // Default avatar
          children: [], // Will be loaded separately
          notifications: {
            unread: 0,
            urgent: 0
          },
          preferences: {
            theme: 'dark',
            language: 'fr',
            notifications: {
              email: true,
              sms: true,
              push: true
            }
          }
        };
        
        setParent(transformedParent);
        
        // Load dashboard data
        loadChildren(user.id);
        loadConversations(user.id);
        loadNotifications(user.id);
        
        // Charger les enfants du parent
        loadParentChildren(user.id);
      } else {
        console.error('No parent data found for user:', user.id);
      }
    } catch (error) {
      console.error('Error loading parent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: Home,
      component: DashboardOverviewTab
    },
    {
      id: 'progress',
      label: 'Progrès des enfants',
      icon: TrendingUp,
      component: ChildrenProgressTab
    },
    {
      id: 'results',
      label: 'Résultats des quiz',
      icon: FileText,
      component: QuizResultsTab
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      component: MessagesTab,

    },
    {
      id: 'calendar',
      label: 'Calendrier',
      icon: Calendar,
      component: CalendarTab
    },
    {
      id: 'meetings',
      label: 'Rendez-vous',
      icon: Users,
      component: MeetingsTab
    },
    {
      id: 'payments',
      label: 'Paiements',
      icon: CreditCard,
      component: PaymentsTab
    },
    {
      id: 'profile',
      label: 'Mon Profil',
      icon: User,
      component: ParentProfileTab
    }
  ];

  const currentMenuItem = menuItems.find(item => item.id === activeTab);
  const CurrentComponent = currentMenuItem?.component || DashboardOverviewTab;

  const selectedChildData = parent?.children.find(child => child.id === selectedChild);
  
  // Debug logs
  console.log('🔍 selectedChildData calculé:', selectedChildData);
  console.log('🔍 selectedChild actuel:', selectedChild);
  console.log('🔍 parent.children:', parent?.children);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = parent?.firstName || 'Parent';
    
    if (hour < 12) return `Bonjour ${firstName}`;
    if (hour < 17) return `Bon après-midi ${firstName}`;
    return `Bonsoir ${firstName}`;
  };

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
    }
  };

  const handleRefresh = () => {
    loadParentData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-white text-base font-semibold mb-2">Chargement du tableau de bord</h2>
          <p className="text-blue-200">Préparation de l'espace parent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
        sidebarOpen ? 'w-80' : 'w-20'
      } bg-blue-900/80 backdrop-blur-md border-r border-blue-700/50 flex flex-col`}>
        {/* Header de la sidebar */}
        <div className="p-6 border-b border-blue-700/50">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-blue-100 text-base font-bold">Espace Parent</h1>
                <p className="text-blue-300 text-sm">Chrono-Carto</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-blue-800/50 text-blue-200 hover:bg-blue-700/50 transition-all"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sélecteur d'enfant */}
        {sidebarOpen && parent && parent.children.length > 1 && (
          <div className="p-4 border-b border-blue-700/50">
            <div className="relative">
              <button
                onClick={() => setChildSelectorOpen(!childSelectorOpen)}
                className="w-full flex items-center justify-between p-3 bg-blue-800/50 rounded-xl text-blue-200 hover:bg-blue-700/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  {selectedChildData?.avatar ? (
                    <img
                      src={selectedChildData.avatar}
                      alt={selectedChildData.firstName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-semibold">{selectedChildData?.firstName}</div>
                    <div className="text-xs text-blue-200">{selectedChildData?.class}</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${childSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {childSelectorOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl border border-white/20 shadow-xl z-50">
                  {parent.children.length > 0 && (
                    parent.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelectedChild(child.id);
                          setChildSelectorOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-blue-800/50 transition-all first:rounded-t-xl last:rounded-b-xl ${
                          selectedChild === child.id ? 'bg-blue-500/20 text-blue-300' : 'text-blue-200'
                        }`}
                      >
                        {child.avatar ? (
                          <img
                            src={child.avatar}
                            alt={child.firstName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">{child.firstName} {child.lastName}</div>
                          <div className="text-xs text-blue-200">{child.class} - {child.school}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu de navigation */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-blue-200 hover:bg-blue-800/50 hover:text-blue-100'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  {sidebarOpen && (
                    <>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">{item.label}</div>
                      </div>

                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profil utilisateur */}
        {sidebarOpen && (
          <div className="p-4 border-t border-blue-700/50">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-800/50 transition-all"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-semibold text-sm">{parent?.firstName} {parent?.lastName}</div>
                  <div className="text-blue-300 text-xs">Parent</div>
                </div>
              </button>

              {/* Menu utilisateur */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-blue-800 rounded-xl border border-blue-700/50 shadow-xl">
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'ml-80' : 'ml-20'
      } flex flex-col min-h-screen`}>
        {/* Header */}
        <div className="bg-blue-900/80 backdrop-blur-md border-b border-blue-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-blue-100 text-base font-bold mb-1">
                {getGreeting()}
              </h1>
              <p className="text-blue-300">
                {currentMenuItem?.label} 
                {selectedChildData && ` - ${selectedChildData.firstName}`}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 w-64 bg-blue-800/50 border border-blue-700/50 rounded-xl text-blue-100 placeholder-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>

              {/* Bouton de déconnexion */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-transparent border border-white/30 rounded-xl text-red-400 hover:bg-red-500/20 hover:border-red-400/50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenu de l'onglet */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <CurrentComponent 
            selectedChild={selectedChildData}
            parent={parent || undefined}
            searchQuery={searchQuery}
            onNavigateToMessages={() => setActiveTab('messages')}
            onNavigateToCalendar={() => setActiveTab('calendar')}
            onNavigateToMeetings={() => setActiveTab('meetings')}
            onNavigateToReports={() => setActiveTab('payments')}
          />
        </div>
      </div>

      {/* Styles pour la scrollbar personnalisée */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #2563eb, #7c3aed);
        }
      `}</style>
    </div>
  );
};

export default ParentDashboard;


