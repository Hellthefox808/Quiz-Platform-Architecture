import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Award, 
  BarChart3, 
  Bell, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  History, 
  Layers, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  ShieldCheck, 
  Trophy, 
  User as UserIcon, 
  X 
} from 'lucide-react';
import { api } from '../../api/client';
import { Notification } from '../../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      if (!user) return;
      const data = await api.get<Notification[]>('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const navItem = (id: string, label: string, icon: React.ReactNode, adminOnly = false) => {
    if (adminOnly && !isAdmin) return null;
    const active = currentView === id;
    return (
      <button
        key={id}
        onClick={() => {
          onNavigate(id);
          setMobileMenuOpen(false);
        }}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
          active
            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Apex<span className="text-indigo-400">Assess</span>
              </span>
              <span className="text-xs text-slate-400 block -mt-1 font-mono">v2.0 • Enterprise Engine</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItem('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
            {navItem('catalog', 'Explore Quizzes', <BookOpen className="w-4 h-4" />)}
            {navItem('history', 'Attempt History', <History className="w-4 h-4" />)}
            {navItem('leaderboard', 'Leaderboard', <Trophy className="w-4 h-4 text-amber-400" />)}
            {navItem('certificates', 'Certificates', <Award className="w-4 h-4 text-emerald-400" />)}

            {isAdmin && (
              <div className="h-5 w-px bg-slate-700 mx-2" />
            )}

            {navItem('admin-dashboard', 'Admin Console', <BarChart3 className="w-4 h-4 text-rose-400" />, true)}
          </nav>

          {/* Right side icons & user */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-slate-900" />
                )}
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3.5 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-sm text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-slate-400 hover:text-indigo-400 transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3.5 hover:bg-slate-700/40 transition text-sm ${
                            !n.is_read ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          <div className="font-medium text-slate-200 text-xs">{n.title}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5 justify-end">
                  {user?.name}
                  {isAdmin && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{user?.email}</div>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {navItem('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
          {navItem('catalog', 'Explore Quizzes', <BookOpen className="w-4 h-4" />)}
          {navItem('history', 'Attempt History', <History className="w-4 h-4" />)}
          {navItem('leaderboard', 'Leaderboard', <Trophy className="w-4 h-4 text-amber-400" />)}
          {navItem('certificates', 'Certificates', <Award className="w-4 h-4 text-emerald-400" />)}
          {isAdmin && navItem('admin-dashboard', 'Admin Console', <BarChart3 className="w-4 h-4 text-rose-400" />, true)}
        </div>
      )}
    </header>
  );
};
