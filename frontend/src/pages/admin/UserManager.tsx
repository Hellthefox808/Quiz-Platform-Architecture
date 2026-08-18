import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserAdmin, UserStatus, UserRole } from '../../types';
import {
  ArrowLeft,
  Search,
  Users,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAdminUsersQuery, useAdminUserMutations } from '../../hooks/useAdminManagement';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { NavigateFunction } from '../../types/navigation';

interface UserManagerProps {
  onNavigate: NavigateFunction;
}

export const UserManager: React.FC<UserManagerProps> = ({ onNavigate }) => {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading: loading, refetch } = useAdminUsersQuery(page, pageSize, searchInput.trim());
  const { updateUserStatus, updateUserRole } = useAdminUserMutations();

  const users: UserAdmin[] = data?.items || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleToggleStatus = async (targetUser: UserAdmin) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot suspend your own administrator account.');
      return;
    }
    const newStatus: UserStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateUserStatus.mutateAsync({ userId: targetUser.id, status: newStatus });
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Failed to update user status');
    }
  };

  const handleToggleRole = async (targetUser: UserAdmin) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot modify your own administrator role.');
      return;
    }
    const newRole: UserRole = targetUser.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
    if (
      !confirm(
        `Are you sure you want to change ${targetUser.name}'s role to ${newRole}?`
      )
    ) {
      return;
    }
    try {
      await updateUserRole.mutateAsync({ userId: targetUser.id, role: newRole });
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Failed to update user role');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Navigation */}
      <div>
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cbb8a9] hover:text-[#faf4ee] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Console
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
          <div>
            <span className="text-xs font-bold text-[#d4a373] uppercase tracking-wider">User Governance</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
              <Users className="w-7 h-7 text-[#d4a373]" />
              Registered Accounts & Roles
            </h1>
            <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
              Inspect user attempt velocities, manage role permissions, and control access statuses.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#887467]" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-4 py-2 text-xs rounded-xl w-64 bg-[#110c09] border border-[#38281e] text-[#faf4ee] placeholder-[#887467] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] shadow-inner"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </form>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="assess-surface rounded-2xl p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#38281e]/40">
              <Skeleton variant="text" width="180px" height="18px" />
              <Skeleton variant="text" width="80px" height="18px" />
              <Skeleton variant="text" width="60px" height="18px" />
              <Skeleton variant="text" width="90px" height="24px" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Users Found"
          description={
            searchInput
              ? 'No users match your active search filter. Try clearing the search term.'
              : 'No user accounts are currently registered in the database.'
          }
          primaryActionLabel={searchInput ? 'Clear Filter' : undefined}
          onPrimaryAction={() => {
            setSearchInput('');
            refetch();
          }}
        />
      ) : (
        <div className="assess-surface rounded-2xl overflow-hidden shadow-xl border border-[#38281e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#cbb8a9]">
              <thead className="bg-[#110c09] text-[10px] uppercase font-mono tracking-wider text-[#887467] border-b border-[#38281e]">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4 text-center">Role</th>
                  <th className="px-6 py-4 text-center">Attempts</th>
                  <th className="px-6 py-4 text-center">Avg Score</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38281e]/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#231a14]/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#faf4ee] text-sm">{u.name}</div>
                      <div className="text-[11px] text-[#887467] mt-0.5 font-mono">{u.email}</div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Badge variant={u.role === 'ADMIN' ? 'accent' : 'info'} size="sm">
                        {u.role}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-center font-mono text-[11px]">
                      <span className="text-emerald-400 font-bold">{u.passed_attempts}</span>
                      <span className="text-[#887467]"> / {u.total_attempts}</span>
                    </td>

                    <td className="px-6 py-4 text-center font-mono text-[11px] font-bold text-[#faf4ee]">
                      {Math.round(u.average_score)}%
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'} size="sm" dot>
                        {u.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRole(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.role === 'ADMIN' ? 'Demote to Student' : 'Promote to Admin'}
                        >
                          <Shield className="w-3.5 h-3.5 text-[#887467]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser?.id}
                          className={u.status === 'ACTIVE' ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}
                          title={u.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                        >
                          {u.status === 'ACTIVE' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};