// ============================================================
// BUSINESS RULES (brief Section 3) — pure functions, koi DB nahi
// ============================================================

export const DEFAULT_SETTINGS = {
  office_start: '09:00',
  grace_minutes: 15,
  weekend_days: [6, 0], // Sat=6, Sun=0
  half_day_hours: 5,
}

export function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isWorkingDay(dateStr, weekendDays, holidaySet) {
  const d = new Date(dateStr + 'T00:00:00')
  if (weekendDays.includes(d.getDay())) return false
  if (holidaySet.has(dateStr)) return false
  return true
}

// Leave: sirf working days count (weekends + holidays skip)
export function workingDaysBetween(startStr, endStr, weekendDays, holidaySet) {
  let count = 0
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isWorkingDay(toDateStr(d), weekendDays, holidaySet)) count++
  }
  return count
}

export function workingDaysInMonth(year, month, weekendDays, holidaySet) {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let i = 1; i <= days; i++) {
    if (isWorkingDay(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`, weekendDays, holidaySet)) count++
  }
  return count
}

// Attendance status (server time stamps)
export function attendanceStatus({ checkIn, checkOut }, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  if (!checkIn) return { status: 'absent', hours: 0 }

  const inDate = new Date(checkIn)
  const [oh, om] = s.office_start.split(':').map(Number)
  const cutoff = new Date(inDate)
  cutoff.setHours(oh, om + s.grace_minutes, 0, 0)
  const late = inDate > cutoff

  let hours = 0
  if (checkOut) {
    hours = (new Date(checkOut) - inDate) / (1000 * 60 * 60)
    hours = Math.round(hours * 100) / 100
  }

  let status
  if (!checkOut) status = 'present' // checkout ke baad missing_checkout detect hota hai payroll/dashboard mein
  else if (hours < s.half_day_hours) status = 'half_day'
  else status = late ? 'late' : 'present'

  return { status, hours, late }
}

// Payroll: gross = 1.5 x basic (HRA 40%, medical 10% of basic)
export function salaryBreakdown(basic) {
  const b = Number(basic) || 0
  return {
    basic: round2(b),
    hra: round2(b * 0.4),
    medical: round2(b * 0.1),
    gross: round2(b * 1.5),
  }
}

// Tax slab (annual gross par, brief se)
export function annualTax(annualGross) {
  const g = Number(annualGross) || 0
  if (g <= 600000) return 0
  if (g <= 1200000) return 0.05 * (g - 600000)
  if (g <= 2400000) return 30000 + 0.15 * (g - 1200000)
  if (g <= 3600000) return 210000 + 0.25 * (g - 2400000)
  return 510000 + 0.35 * (g - 3600000)
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// Poora payslip calculation
export function computePayslip({ employee, workingDays, presentDays, halfDays, missingCheckoutDays, unpaidLeaveDays, absentDays }) {
  const sal = salaryBreakdown(employee.basic_salary)
  const perDay = workingDays > 0 ? sal.gross / workingDays : 0
  const deductionDays = absentDays + unpaidLeaveDays + 0.5 * (halfDays + missingCheckoutDays)
  const deduction = round2(perDay * deductionDays)
  const tax = round2(annualTax(sal.gross * 12) / 12)
  const net = round2(sal.gross - deduction - tax)
  return {
    ...sal,
    working_days: workingDays,
    payable_days: round2(workingDays - deductionDays),
    absent_days: absentDays,
    half_days: halfDays + missingCheckoutDays,
    unpaid_leave_days: unpaidLeaveDays,
    deduction,
    tax,
    net,
  }
}

export function nextEmployeeCode(count) {
  return 'EMP-' + String(count + 1).padStart(3, '0')
}

export function tempPassword() {
  return 'Hcm@' + Math.random().toString(36).slice(2, 8) + '1!'
}
