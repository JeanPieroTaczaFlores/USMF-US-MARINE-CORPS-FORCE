export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-base-600/30 text-base-300 border-base-600/40',
    accent: 'bg-accent-muted text-accent border-accent-border',
    danger: 'bg-danger-muted text-danger border-danger-border',
    success: 'bg-success-muted text-success border-success/20',
    warning: 'bg-warning-muted text-warning border-warning/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase rounded border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-base-800/50 border border-base-700/40 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-base-500" />}
      </div>
      <div className="font-display text-2xl sm:text-3xl font-semibold text-base-100">{value}</div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon className="w-10 h-10 text-base-600 mb-4" strokeWidth={1.5} />}
      <p className="text-sm font-medium text-base-300 mb-1">{title}</p>
      {description && <p className="text-xs text-base-500">{description}</p>}
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-0 border-b border-base-700/50 overflow-x-auto mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            active === tab.id
              ? 'text-accent border-accent'
              : 'text-base-400 border-transparent hover:text-base-200'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-[10px] opacity-60">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-base-800/50 border border-base-700/40 rounded-lg text-sm text-base-200 placeholder-base-500 focus:outline-none focus:border-accent/40 transition-colors"
    />
  )
}
