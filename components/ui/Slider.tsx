export const Slider = ({ value, onChange, label, disabled }: { value: number, onChange: (val: number) => void, label: string, disabled?: boolean }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
      <span className="ml-1">{label}</span>
      <span className="text-cyan-400">{value}%</span>
    </div>
    <div className="relative w-full h-2 bg-slate-800 rounded-full">
      <div
        className="absolute h-full bg-linear-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  </div>
);