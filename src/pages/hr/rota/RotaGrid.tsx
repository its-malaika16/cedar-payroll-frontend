import { User } from 'lucide-react'
import { fullName, idOf } from '../../../lib/format'
import { AddShiftCell, LeaveCard, ShiftCard, type ShiftAction } from './ShiftCard'
import { dateKey, isWeekend } from './rotaDates'
import {
  employeeIdOf,
  isApprovedLeave,
  leaveCoversDate,
  shiftDateKey,
  type LeaveItem,
  type RotaEmployee,
  type RotaShift,
} from './rotaModel'

function Cell({
  shifts,
  onLeave,
  leaveTitle,
  compact,
  muted,
  showDayOff,
  onAdd,
  onAction,
}: {
  shifts: RotaShift[]
  onLeave: boolean
  leaveTitle?: string
  compact: boolean
  muted?: boolean
  showDayOff: boolean
  onAdd: () => void
  onAction: (shift: RotaShift, action: ShiftAction) => void
}) {
  return (
    <div className={`min-w-0 border-l border-[#eceae6] p-1.5 ${muted ? 'bg-[#fafafa]' : 'bg-white'}`}>
      {onLeave ? (
        <LeaveCard compact={compact} title={leaveTitle} />
      ) : shifts.length > 0 ? (
        <div className="space-y-1.5">
          {shifts.map((shift) => (
            <ShiftCard
              key={idOf(shift)}
              shift={shift}
              compact={compact}
              onAction={(action) => onAction(shift, action)}
            />
          ))}
        </div>
      ) : (
        <AddShiftCell compact={compact} showDayOff={showDayOff} onClick={onAdd} />
      )}
    </div>
  )
}

function weekdayHeaders(days: Date[]) {
  return days.map((day) => day.toLocaleDateString('en-GB', { weekday: 'short' }))
}

function gridColumns(count: number) {
  return { gridTemplateColumns: `188px repeat(${Math.max(count, 1)}, minmax(0, 1fr))` }
}

function openShiftsOn(shifts: RotaShift[], key: string) {
  return shifts.filter((shift) => !shift.employee_id && shiftDateKey(shift) === key)
}

function employeeShiftsOn(shifts: RotaShift[], employeeId: string, key: string) {
  return shifts.filter(
    (shift) => employeeIdOf(shift) === employeeId && Boolean(shift.employee_id) && shiftDateKey(shift) === key,
  )
}

function employeeOnLeave(leave: LeaveItem[], employeeId: string, key: string) {
  return leave.find(
    (item) => isApprovedLeave(item) && employeeIdOf(item) === employeeId && leaveCoversDate(item, key),
  )
}

function MonthDayCell({
  day,
  inMonth,
  shifts,
  onLeave,
  leaveTitle,
  onAdd,
  onAction,
}: {
  day: Date
  inMonth: boolean
  shifts: RotaShift[]
  onLeave: boolean
  leaveTitle?: string
  onAdd: () => void
  onAction: (shift: RotaShift, action: ShiftAction) => void
}) {
  return (
    <div
      className={`relative min-h-[118px] border-l border-b border-[#eceae6] p-1.5 ${
        inMonth ? 'bg-white' : 'bg-[#f7f6f3]'
      }`}
    >
      <span
        className={`absolute top-1.5 left-2 text-[11px] font-semibold ${
          inMonth ? 'text-navy/55' : 'text-[#c4c4c4]'
        }`}
      >
        {day.getDate()}
      </span>
      <div className="pt-5">
        {onLeave ? (
          <LeaveCard compact title={leaveTitle} />
        ) : shifts.length > 0 ? (
          <div className="space-y-1.5">
            {shifts.map((shift) => (
              <ShiftCard
                key={idOf(shift)}
                shift={shift}
                compact
                showDuration
                onAction={(action) => onAction(shift, action)}
              />
            ))}
          </div>
        ) : (
          <AddShiftCell compact onClick={onAdd} />
        )}
      </div>
    </div>
  )
}

function MonthPersonBlock({
  label,
  icon,
  weeks,
  inRange,
  shiftsForDay,
  leaveForDay,
  onAdd,
  onAction,
}: {
  label: string
  icon?: boolean
  weeks: Date[][]
  inRange: (day: Date) => boolean
  shiftsForDay: (day: Date) => RotaShift[]
  leaveForDay?: (day: Date) => LeaveItem | undefined
  onAdd: (date: Date) => void
  onAction: (shift: RotaShift, action: ShiftAction) => void
}) {
  return (
    <div className="grid grid-cols-[188px_minmax(0,1fr)] border-b border-[#eceae6] last:border-b-0">
      <div className="sticky left-0 z-10 flex items-center gap-2 self-stretch border-r border-[#eceae6] bg-white px-4 py-4 text-sm font-medium text-navy">
        {icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-navy/70">
            <User size={14} />
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </div>
      <div>
        {weeks.map((week) => (
          <div key={dateKey(week[0])} className="grid" style={gridColumns(week.length)}>
            {week.map((day) => (
              <MonthDayCell
                key={dateKey(day)}
                day={day}
                inMonth={inRange(day)}
                shifts={shiftsForDay(day)}
                onLeave={Boolean(leaveForDay?.(day))}
                leaveTitle={leaveForDay?.(day)?.leave_type ?? undefined}
                onAdd={() => onAdd(day)}
                onAction={onAction}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RotaMonthGrid({
  weeks,
  month,
  year,
  employees,
  shifts,
  leave,
  inRange,
  onAdd,
  onAction,
}: {
  weeks: Date[][]
  month: number
  year: number
  employees: RotaEmployee[]
  shifts: RotaShift[]
  leave: LeaveItem[]
  inRange?: (date: Date) => boolean
  onAdd: (employeeId: string | null, date: Date) => void
  onAction: (shift: RotaShift, action: ShiftAction) => void
}) {
  const headerDays = weeks[0] ?? []
  const columns = headerDays.length || 7
  const dayInRange = inRange ?? ((day: Date) => day.getMonth() === month && day.getFullYear() === year)
  return (
    <div className="min-w-[1100px]">
      <div
        className="sticky top-0 z-20 grid border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold text-navy"
        style={gridColumns(columns)}
      >
        <div className="sticky left-0 z-30 bg-[#f7f6f3] px-4 py-3">Employee</div>
        {weekdayHeaders(headerDays).map((day, index) => (
          <div key={`${day}-${index}`} className="border-l border-[#eceae6] px-2 py-3 text-center">
            {day}
          </div>
        ))}
      </div>

      <MonthPersonBlock
        label="Open Shifts"
        weeks={weeks}
        inRange={dayInRange}
        shiftsForDay={(day) => openShiftsOn(shifts, dateKey(day))}
        onAdd={(day) => onAdd(null, day)}
        onAction={onAction}
      />

      {employees.map((employee) => {
        const employeeId = String(employee.id)
        return (
          <MonthPersonBlock
            key={employeeId}
            label={fullName(employee.first_name, employee.last_name)}
            icon
            weeks={weeks}
            inRange={dayInRange}
            shiftsForDay={(day) => employeeShiftsOn(shifts, employeeId, dateKey(day))}
            leaveForDay={(day) => employeeOnLeave(leave, employeeId, dateKey(day))}
            onAdd={(day) => onAdd(employeeId, day)}
            onAction={onAction}
          />
        )
      })}
    </div>
  )
}

export function RotaWeekGrid({
  days,
  employees,
  shifts,
  leave,
  compact = false,
  inMonth,
  onAdd,
  onAction,
}: {
  days: Date[]
  employees: RotaEmployee[]
  shifts: RotaShift[]
  leave: LeaveItem[]
  compact?: boolean
  inMonth?: (date: Date) => boolean
  onAdd: (employeeId: string | null, date: Date) => void
  onAction: (shift: RotaShift, action: ShiftAction) => void
}) {
  const openShifts = (key: string) => openShiftsOn(shifts, key)
  const employeeShifts = (employeeId: string, key: string) => employeeShiftsOn(shifts, employeeId, key)
  const employeeLeave = (employeeId: string, key: string) => employeeOnLeave(leave, employeeId, key)
  const columns = gridColumns(days.length)

  return (
    <div className="min-w-[980px]">
      <div
        className="grid border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold text-navy"
        style={columns}
      >
        <div className="sticky left-0 z-10 bg-[#f7f6f3] px-4 py-3">Employee</div>
        {days.map((day) => (
          <div key={dateKey(day)} className="border-l border-[#eceae6] px-2 py-3 text-center">
            {compact ? (
              <span className="text-[11px] uppercase tracking-wide text-muted">
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
            ) : (
              day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
            )}
          </div>
        ))}
      </div>

      <div className="grid border-b border-[#eceae6]" style={columns}>
        <div className="sticky left-0 z-10 flex items-center bg-white px-4 py-3 text-sm font-semibold text-navy">
          Open Shifts
        </div>
        {days.map((day) => {
          const key = dateKey(day)
          const muted = inMonth ? !inMonth(day) : false
          return (
            <Cell
              key={`open-${key}`}
              shifts={openShifts(key)}
              onLeave={false}
              compact={compact}
              muted={muted}
              showDayOff={false}
              onAdd={() => onAdd(null, day)}
              onAction={onAction}
            />
          )
        })}
      </div>

      {employees.map((employee) => {
        const employeeId = String(employee.id)
        return (
          <div
            key={employeeId}
            className="grid border-b border-[#eceae6] last:border-b-0"
            style={columns}
          >
            <div className="sticky left-0 z-10 flex items-center gap-2 bg-white px-4 py-3 text-sm font-medium text-navy">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#eef2f6] text-navy/70">
                <User size={14} />
              </span>
              <span className="truncate">{fullName(employee.first_name, employee.last_name)}</span>
            </div>
            {days.map((day) => {
              const key = dateKey(day)
              const muted = inMonth ? !inMonth(day) : false
              return (
                <div key={`${employeeId}-${key}`} className={`relative ${compact ? 'pt-4' : ''}`}>
                  {compact ? (
                    <span className="absolute top-1 left-2 z-[1] text-[10px] font-semibold text-muted">
                      {day.getDate()}
                    </span>
                  ) : null}
                  <Cell
                    shifts={employeeShifts(employeeId, key)}
                    onLeave={Boolean(employeeLeave(employeeId, key))}
                    leaveTitle={employeeLeave(employeeId, key)?.leave_type ?? undefined}
                    compact={compact}
                    muted={muted}
                    showDayOff={isWeekend(day)}
                    onAdd={() => onAdd(employeeId, day)}
                    onAction={onAction}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
