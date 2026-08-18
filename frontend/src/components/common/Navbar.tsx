import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Trophy,
  X,
} from 'lucide-react';
import { notificationApi } from '../../api/client';
import { notificationKeys } from '../../lib/queryKeys';
import { queryPolicies } from '../../lib/queryPolicies';
import { View, NavigateFunction } from '../../types/navigation';
import { Badge } from '../ui/Badge';

interface NavbarProps {
  currentView: View;
  onNavigate: NavigateFunction;
}

type NavRoute = 'dashboard' | 'catalog' | 'history' | 'leaderboard' | 'certificates' | 'admin-dashboard';

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // TanStack Query for notifications
  const { data: notifications = [] } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ signal }) => notificationApi.list(signal),
    enabled: !!user,
    ...queryPolicies.notifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const navItem = (id: NavRoute, label: string, icon: React.ReactNode, adminOnly = false) => {
    if (adminOnly && !isAdmin) return null;
    const active = currentView === id;
    return (
      <button
        key={id}
        onClick={() => {
          onNavigate(id);
          setMobileMenuOpen(false);
        }}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer select-none ${
          active
            ? 'bg-[#b07238]/10 text-[#b46927] border border-[#b07238]/30 shadow-sm shadow-[#b07238]/10'
            : 'text-[#5c4738] hover:text-[#1c130d] hover:bg-[#ede4d8]/70'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e8dfd5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#b07238] via-[#c89666] to-[#8c531e] flex items-center justify-center shadow-md shadow-[#b07238]/20 border border-[#dfb58a]/40">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-extrabold text-[#1c130d] tracking-tight flex items-center gap-1">
                Apex<span className="text-[#b46927]">Assess</span>
              </span>
              <span className="text-[9px] text-[#8a7465] block -mt-1 font-mono tracking-wider uppercase font-bold">
                Enterprise Engine
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItem('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
            {navItem('catalog', 'Explore Quizzes', <BookOpen className="w-4 h-4" />)}
            {navItem('history', 'History', <History className="w-4 h-4" />)}
            {navItem('leaderboard', 'Leaderboard', <Trophy className="w-4 h-4 text-amber-600" />)}
            {navItem('certificates', 'Certificates', <Award className="w-4 h-4 text-emerald-600" />)}

            {isAdmin && <div className="h-4 w-px bg-[#e8dfd5] mx-2" />}

            {navItem('admin-dashboard', 'Admin Console', <BarChart3 className="w-4 h-4 text-rose-600" />, true)}
          </nav>

          {/* Right Side Icons & Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Popover */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-[#5c4738] hover:text-[#1c130d] hover:bg-[#ede4d8] transition cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#b46927] rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#e8dfd5] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3.5 bg-[#f5efe8] border-b border-[#e8dfd5] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#b46927]" />
                      <span className="font-bold text-xs text-[#1c130d] uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <Badge variant="info" size="sm">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        disabled={markAllReadMutation.isPending}
                        className="text-[10px] uppercase font-bold tracking-wider text-[#5c4738] hover:text-[#b46927] transition cursor-pointer"
                      >
                        {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#e8dfd5]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#8a7465]">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-xs transition ${
                            !n.is_read ? 'bg-[#b07238]/5' : 'hover:bg-[#f5efe8]/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-[#1c130d]">{n.title}</span>
                            <span className="text-[10px] text-[#8a7465] font-mono shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[#5c4738] text-[11px] mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-[#e8dfd5]">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-[#1c130d] leading-none">{user.name}</div>
                  <div className="text-[9px] font-mono font-bold mt-1 tracking-wider uppercase">
                    {isAdmin ? (
                      <span className="text-rose-600">ADMINISTRATOR</span>
                    ) : (
                      <span className="text-emerald-600">STUDENT</span>
                    )}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f5efe8] to-[#ede4d8] border border-[#d8ccbf] flex items-center justify-center text-[#b46927] font-black text-xs shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-1.5 text-[#8a7465] hover:text-rose-600 hover:bg-[#ede4d8] rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#5c4738] hover:text-[#1c130d] hover:bg-[#ede4d8]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e8dfd5] bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItem('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
          {navItem('catalog', 'Explore Quizzes', <BookOpen className="w-4 h-4" />)}
          {navItem('history', 'History', <History className="w-4 h-4" />)}
          {navItem('leaderboard', 'Leaderboard', <Trophy className="w-4 h-4 text-amber-600" />)}
          {navItem('certificates', 'Certificates', <Award className="w-4 h-4 text-emerald-600" />)}
          {isAdmin && (
            <div className="pt-2 border-t border-[#e8dfd5] mt-2">
              {navItem('admin-dashboard', 'Admin Console', <BarChart3 className="w-4 h-4 text-rose-600" />, true)}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
