import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/Header';
import { 
  Search, 
  Shield, 
  User as UserIcon, 
  Briefcase, 
  MapPin,
  MailCheck,
  MailX,
  Loader2,
  AlertCircle,
  X,
  Edit2,
  Check,
  Key
} from 'lucide-react';
import { usersApi } from '../../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  managedEntityId?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [managedEntityId, setManagedEntityId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);

  // Password Reset Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getAll();
      if (response.data) {
        setUsers(response.data.users);
      } else {
        setError(response.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setManagedEntityId(user.managedEntityId || '');
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    try {
      const response = await usersApi.updateRole(editingUser.id, {
        role: selectedRole,
        managedEntityId: selectedRole === 'manager' ? managedEntityId : undefined
      });

      if (response.data) {
        // Update local state
        setUsers(users.map(u => 
          u.id === editingUser.id 
            ? { ...u, role: selectedRole, managedEntityId: selectedRole === 'manager' ? managedEntityId : undefined } 
            : u
        ));
        setIsModalOpen(false);
        setEditingUser(null);
      } else {
        alert(response.error || 'Failed to update role');
      }
    } catch (err) {
      alert('An error occurred while updating role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmailVerified = async (user: User) => {
    const nextValue = !user.isEmailVerified;
    const confirmationText = nextValue
      ? `Manually verify email for ${user.email}? This will allow them to write reviews and access verified-only features.`
      : `Mark ${user.email} as NOT verified? This may block them from writing reviews.`;

    const didConfirm = window.confirm(confirmationText);
    if (!didConfirm) return;

    setVerifyingUserId(user.id);
    try {
      const response = await usersApi.setEmailVerified(user.id, nextValue);
      if (!response.data) {
        alert(response.error || 'Failed to update email verification');
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? { ...currentUser, isEmailVerified: nextValue }
            : currentUser
        )
      );
    } catch {
      alert('An error occurred while updating email verification');
    } finally {
      setVerifyingUserId(null);
    }
  };

  const handlePasswordResetClick = (user: User) => {
    setEditingUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleSavePassword = async () => {
    if (!editingUser || !newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await usersApi.resetPassword(editingUser.id, newPassword);
      if (response.data) {
        alert('Password updated successfully');
        setIsPasswordModalOpen(false);
        setEditingUser(null);
      } else {
        alert(response.error || 'Failed to reset password');
      }
    } catch (err) {
      alert('An error occurred while resetting password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const roleFilterParam = (searchParams.get('role') || '').toLowerCase();
  const roleFilter = ['tourist', 'guide', 'business_owner', 'manager', 'admin'].includes(roleFilterParam)
    ? roleFilterParam
    : '';

  const filteredUsers = users.filter(user => {
    const matchesQuery =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter ? user.role === roleFilter : true;

    return matchesQuery && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'guide': return 'bg-green-100 text-green-700';
      case 'business_owner': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEmailBadge = (isEmailVerified: boolean) => {
    return isEmailVerified
      ? { label: 'Email verified', className: 'bg-emerald-100 text-emerald-700' }
      : { label: 'Email not verified', className: 'bg-rose-100 text-rose-700' };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="Manage Users" />

      <div className="p-6 pt-20">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {roleFilter && (
          <div className="mb-4 flex items-center justify-between bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
            <div className="text-sm text-slate-700">
              Filtering by role: <span className="font-bold uppercase tracking-wide">{roleFilter.replace('_', ' ')}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="text-sm font-medium text-sky-700 hover:text-sky-800"
              aria-label="Clear role filter"
            >
              Clear
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No users found matching your search.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UserIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{user.username}</h3>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${getEmailBadge(user.isEmailVerified).className}`}>
                          {getEmailBadge(user.isEmailVerified).label}
                        </span>
                        {user.role === 'manager' && user.managedEntityId && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Briefcase size={10} />
                            ID: {user.managedEntityId.substring(0, 6)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleEmailVerified(user)}
                      disabled={verifyingUserId === user.id}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                      aria-label={user.isEmailVerified ? 'Mark email as not verified' : 'Manually verify email'}
                    >
                      {verifyingUserId === user.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : user.isEmailVerified ? (
                        <MailCheck size={18} />
                      ) : (
                        <MailX size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handlePasswordResetClick(user)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      aria-label="Reset password"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => handleEditClick(user)}
                      className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      aria-label="Edit role"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {isPasswordModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fade-slide-up">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Reset User Password</h3>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  User
                </label>
                <div className="p-3 bg-gray-50 rounded-xl text-slate-600 text-sm">
                  {editingUser.username} ({editingUser.email})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Must be at least 6 characters.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-slate-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassword}
                disabled={isResettingPassword}
                className="flex-1 py-3 px-4 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Key size={18} />
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fade-slide-up">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit User Role</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  User
                </label>
                <div className="p-3 bg-gray-50 rounded-xl text-slate-600 text-sm">
                  {editingUser.username} ({editingUser.email})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="tourist">Tourist</option>
                  <option value="guide">Tour Guide</option>
                  <option value="business_owner">Business Owner</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {selectedRole === 'manager' && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Managed Entity ID
                  </label>
                  <input
                    type="text"
                    value={managedEntityId}
                    onChange={(e) => setManagedEntityId(e.target.value)}
                    placeholder="Enter Attraction or Business ID"
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The ID of the attraction or business this user manages.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-slate-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isSaving}
                className="flex-1 py-3 px-4 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;