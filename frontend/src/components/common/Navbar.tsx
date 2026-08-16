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
  Shield, 
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
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
          active
            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090e1a]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Apex<span className="text-blue-500">Assess</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">Enterprise Engine</span>
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
              <div className="h-4 w-px bg-slate-800 mx-2" />
            )}

            {navItem('admin-dashboard', 'Admin Console', <BarChart3 className="w-4 h-4 text-rose-400" />, true)}
          </nav>

          {/* Right side icons & user */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-slate-900" />
                )}
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-xs text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-slate-400 hover:text-blue-400 transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition ${
                            !n.is_read ? 'bg-blue-600/5' : 'hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-200">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {isAdmin ? (
                      <span className="text-rose-400 font-bold">ADMIN</span>
                    ) : (
                      <span className="text-emerald-400">STUDENT</span>
                    )}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#090e1a] px-4 pt-2 pb-4 space-y-1">
          {navItem('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
          {navItem('catalog', 'Explore Quizzes', <BookOpen className="w-4 h-4" />)}
          {navItem('history', 'Attempt History', <History className="w-4 h-4" />)}
          {navItem('leaderboard', 'Leaderboard', <Trophy className="w-4 h-4 text-amber-400" />)}
          {navItem('certificates', 'Certificates', <Award className="w-4 h-4 text-emerald-400" />)}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-800 mt-2">
              {navItem('admin-dashboard', 'Admin Console', <BarChart3 className="w-4 h-4 text-rose-400" />, true)}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
