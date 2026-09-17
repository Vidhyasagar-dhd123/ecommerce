import { useState } from 'react';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  UserPlus,
  ExternalLink,
  Shield,
} from 'lucide-react';
import type { AdminUserItem } from '../model/adminTypes';

interface AdminUserManagementTabProps {
  users: AdminUserItem[];
  isLoading: boolean;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleStatus: (userId: number, is_active: boolean) => void;
  onOpenPromoteModal: (user: { id: number; username: string }) => void;
  isToggling: boolean;
}

export function AdminUserManagementTab({
  users,
  isLoading,
  roleFilter,
  onRoleFilterChange,
  searchQuery,
  onSearchChange,
  onToggleStatus,
  onOpenPromoteModal,
  isToggling,
}: AdminUserManagementTabProps) {
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'customer', 'employee', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => onRoleFilterChange(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                roleFilter === role
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'all' ? 'All Roles' : role}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search username, email..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role & Designation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-4">
                      <div className="h-6 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadgeClass =
                    u.role === 'admin'
                      ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                      : u.role === 'employee'
                        ? 'bg-amber-50 text-amber-700 ring-amber-700/10'
                        : 'bg-slate-100 text-slate-700 ring-slate-700/10';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          @{u.username}
                        </div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${roleBadgeClass}`}
                          >
                            {u.role}
                          </span>
                          {u.designation && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {u.designation}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {new Date(u.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role === 'customer' && (
                            <button
                              onClick={() =>
                                onOpenPromoteModal({ id: u.id, username: u.username })
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                              title="Promote to Staff / Employee"
                            >
                              <UserPlus className="h-3 w-3 text-blue-600" />
                              Promote
                            </button>
                          )}

                          <button
                            onClick={() => onToggleStatus(u.id, !u.is_active)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold shadow-2xs transition ${
                              u.is_active
                                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? (
                              <>
                                <UserX className="h-3 w-3" />
                                Disable
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" />
                                Enable
                              </>
                            )}
                          </button>

                          <a
                            href={`http://localhost:8000/admin/users/user/${u.id}/change/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Open in Django Admin"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
