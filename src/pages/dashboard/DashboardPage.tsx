import { useEffect, useState } from 'react'
import { FileText, BookOpen, TrendingUp, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

/**
 * DashboardPage — route: /app/dashboard
 * Overview page showing summary cards for each module.
 */
export default function DashboardPage() {
  const { labId } = useAuthStore()

  const [doctorsThisMonth, setDoctorsThisMonth] = useState<number | null>(null)
  const [doctorTotal, setDoctorTotal] = useState<number | null>(null)
  const [monthTotal, setMonthTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!labId) return

    const monthPrefix = new Date().toISOString().slice(0, 7)

    Promise.all([
      supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('lab_id', labId).gte('created_at', `${monthPrefix}-01`),
      supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('lab_id', labId),
      supabase
        .from('warranty_cards')
        .select('id', { count: 'exact', head: true })
        .eq('lab_id', labId)
        .gte('created_at', `${monthPrefix}-01`),
    ]).then(([dm, doc, mc]) => {
      setDoctorsThisMonth(dm.count ?? 0)
      setDoctorTotal(doc.count ?? 0)
      setMonthTotal(mc.count ?? 0)
    }).catch(console.error)
  }, [labId])

  const stats = [
    {
      label: 'Doctors Added This Month',
      value: doctorsThisMonth !== null ? String(doctorsThisMonth) : '—',
      description: 'New doctors registered',
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Doctor Ledger',
      value: doctorTotal !== null ? String(doctorTotal) : '—',
      description: 'Active doctors',
      icon: BookOpen,
      color: 'cyan',
    },
    {
      label: 'This Month',
      value: monthTotal !== null ? String(monthTotal) : '—',
      description: 'Cards issued',
      icon: TrendingUp,
      color: 'violet',
    },
    {
      label: 'System Status',
      value: 'Active',
      description: 'All systems operational',
      icon: Activity,
      color: 'emerald',
    },
  ]

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    cyan: 'from-cyan-500 to-cyan-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
  }

  const bgMap: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20',
    violet: 'bg-violet-500/10 border-violet-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
  }

  const textMap: Record<string, string> = {
    blue: 'text-blue-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Welcome back. Here&apos;s an overview of your lab.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 ${bgMap[stat.color]} transition-all duration-200 hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[stat.color]} flex items-center justify-center shadow-lg`}
              >
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <p className={`text-2xl font-bold mb-1 ${textMap[stat.color]}`}>
              {stat.value}
            </p>
            <p className="text-white font-medium text-sm">{stat.label}</p>
            <p className="text-slate-500 text-xs mt-0.5">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Quick access modules */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Warranty Card',
              description: 'Issue and manage dental warranty cards for patients.',
              icon: FileText,
              href: '/app/warranty-card',
              color: 'blue',
            },
            {
              title: 'Doctor Ledger',
              description: 'Track outstanding balances and payments per doctor.',
              icon: BookOpen,
              href: '/app/doctor-ledger',
              color: 'cyan',
            },
          ].map((module) => (
            <a
              key={module.title}
              href={module.href}
              className={`group rounded-2xl border p-6 ${bgMap[module.color]} hover:scale-[1.01] transition-all duration-200 block`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[module.color]} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
              >
                <module.icon size={24} className="text-white" />
              </div>
              <h3 className="text-white font-semibold mb-1">{module.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {module.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
