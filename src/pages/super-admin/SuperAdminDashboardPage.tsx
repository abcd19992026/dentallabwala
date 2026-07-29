import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  Edit,
  KeyRound,
  Power,
  Search,
  LogOut,
  FileCheck,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { DentalLabClient, CreateClientInput } from '@/features/super-admin/types/client'
import {
  getClients,
  createClient,
  updateClient,
  toggleClientStatus,
  resetClientPassword,
  deleteClient,
} from '@/features/super-admin/services/client.service'
import { ClientModal } from '@/features/super-admin/components/ClientModal'
import { ResetPasswordModal } from '@/features/super-admin/components/ResetPasswordModal'
import { getGlobalWarrantyCardCounts, getWarrantyCardCounts } from '@/features/warranty-card/services/warrantyCard.service'

export default function SuperAdminDashboardPage() {
  const { logout } = useAuth()
  const [clients, setClients] = useState<DentalLabClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<DentalLabClient | null>(null)

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetTargetClient, setResetTargetClient] = useState<DentalLabClient | null>(null)

  // Warranty card counts
  const [globalWarrantyCounts, setGlobalWarrantyCounts] = useState({ total: 0, thisMonth: 0 })
  const [perLabWarrantyCounts, setPerLabWarrantyCounts] = useState<Record<string, { total: number; thisMonth: number }>>({})

  const loadClients = async () => {
    setLoading(true)
    try {
      const data = await getClients()
      setClients(data)

      const labIds = data.map((c) => c.id)
      const [globalCounts, perLabCounts] = await Promise.all([
        getGlobalWarrantyCardCounts(),
        getWarrantyCardCounts(labIds),
      ])
      setGlobalWarrantyCounts(globalCounts)
      setPerLabWarrantyCounts(perLabCounts)
    } catch (err) {
      console.error('Error loading clients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  // Action handlers
  const handleOpenAddModal = () => {
    setEditingClient(null)
    setIsClientModalOpen(true)
  }

  const handleOpenEditModal = (client: DentalLabClient) => {
    setEditingClient(client)
    setIsClientModalOpen(true)
  }

  const handleSaveClient = async (formData: CreateClientInput) => {
    if (editingClient) {
      await updateClient(editingClient.id, formData)
    } else {
      await createClient(formData)
    }
    await loadClients()
  }

  const handleToggleStatus = async (client: DentalLabClient) => {
    await toggleClientStatus(client.id, client.isActive)
    await loadClients()
  }

  const handleOpenResetPassword = (client: DentalLabClient) => {
    setResetTargetClient(client)
    setIsResetPasswordOpen(true)
  }

  const handleConfirmResetPassword = async (clientId: string, newPass: string) => {
    await resetClientPassword(clientId, newPass)
  }

  const handleDeleteClient = async (client: DentalLabClient) => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this client? This action cannot be undone.'
    )
    if (!confirmed) return
    await deleteClient(client.id)
    await loadClients()
  }

  // Filtered clients list
  const filteredClients = clients.filter((c) => {
    const query = searchQuery.toLowerCase()
    return (
      c.labName.toLowerCase().includes(query) ||
      (c.ownerName && c.ownerName.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.mobileNumber && c.mobileNumber.toLowerCase().includes(query))
    )
  })

  const activeCount = clients.filter((c) => c.isActive).length
  const inactiveCount = clients.length - activeCount

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">Super Admin Control Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Platform Owner
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">
                Dental Lab Wala · Client & Tenant Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25 cursor-pointer"
            >
              <Plus size={18} />
              Add New Dental Lab
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 text-sm font-medium transition-colors cursor-pointer"
              title="Logout Super Admin"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Labs</p>
              <p className="text-3xl font-bold text-white mt-1">{clients.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active Clients</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{activeCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Inactive Clients</p>
              <p className="text-3xl font-bold text-slate-500 mt-1">{inactiveCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <XCircle size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Warranty Cards</p>
              <p className="text-3xl font-bold text-violet-400 mt-1">{globalWarrantyCounts.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <FileCheck size={24} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Warranty Cards This Month</p>
              <p className="text-3xl font-bold text-cyan-400 mt-1">{globalWarrantyCounts.thisMonth}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileCheck size={24} />
            </div>
          </div>
        </div>

        {/* Clients List Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Section Toolbar */}
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Registered Dental Labs</h2>
              <p className="text-xs text-slate-400">Manage client accounts, template, and statuses</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search labs, owners, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">Loading dental labs...</div>
          ) : filteredClients.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Building2 size={40} className="text-slate-700 mx-auto" />
              <p className="text-slate-400 font-medium">No Dental Labs Found</p>
              <p className="text-xs text-slate-600">Click &quot;Add New Dental Lab&quot; to register a client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Lab / Owner</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Template Uploaded</th>
                    <th className="px-6 py-4 text-center">Total Warranty Cards</th>
                    <th className="px-6 py-4 text-center">This Month</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredClients.map((client) => {
                    const templateCount = [
                      client.templateAFrontUrl,
                      client.templateABackUrl,
                      client.templateBFrontUrl,
                      client.templateBBackUrl,
                    ].filter(Boolean).length

                    return (
                      <tr key={client.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Lab / Owner */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-base flex-shrink-0">
                              {client.labName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white leading-snug">{client.labName}</p>
                              <p className="text-xs text-slate-400">{client.ownerName || 'No owner specified'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-4 text-xs">
                          <p className="text-slate-200">{client.email || '—'}</p>
                          <p className="text-slate-500 mt-0.5">{client.mobileNumber || '—'}</p>
                        </td>

                        {/* Template Uploaded */}
                        <td className="px-6 py-4 text-xs">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                            <FileCheck size={13} className="text-violet-400" />
                            <span>{templateCount} / 4 Attached</span>
                          </div>
                        </td>

                        {/* Total Warranty Cards */}
                        <td className="px-6 py-4 text-center text-sm font-semibold text-white">
                          {perLabWarrantyCounts[client.id]?.total ?? '...'}
                        </td>

                        {/* This Month */}
                        <td className="px-6 py-4 text-center text-sm font-semibold text-cyan-400">
                          {perLabWarrantyCounts[client.id]?.thisMonth ?? '...'}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${client.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${client.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                            />
                            {client.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit Client */}
                            <button
                              onClick={() => handleOpenEditModal(client)}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Edit Client Details"
                            >
                              <Edit size={15} />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => handleOpenResetPassword(client)}
                              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
                              title="Reset Client Password"
                            >
                              <KeyRound size={15} />
                            </button>

                            {/* Toggle Activate / Deactivate */}
                            <button
                              onClick={() => handleToggleStatus(client)}
                              className={`p-2 rounded-lg border transition-colors ${client.isActive
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                }`}
                              title={client.isActive ? 'Deactivate Client' : 'Activate Client'}
                            >
                              <Power size={15} />
                            </button>

                            {/* Delete Client */}
                            <button
                              onClick={() => handleDeleteClient(client)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                              title="Delete Client"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        initialData={editingClient}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        client={resetTargetClient}
        onClose={() => setIsResetPasswordOpen(false)}
        onReset={handleConfirmResetPassword}
      />
    </div>
  )
}
