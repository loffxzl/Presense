// Pure date-window helpers for the admin dashboard.
// No DB and no framework imports, so this can be tested with plain node.
//
// Every "day" here is an Asia/Kolkata calendar day. IST has no DST (fixed
// +05:30), so a calendar day always maps to a fixed 24h window in UTC.

export const TZ = 'Asia/Kolkata';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const utcMs = (dateStr) => Date.parse(`${dateStr}T00:00:00Z`);

export const istToday = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
export const istYearOf = (date) => Number(new Date(date).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 4));
export const istStart = (dateStr) => new Date(`${dateStr}T00:00:00+05:30`);

export const addDays = (dateStr, n) => new Date(utcMs(dateStr) + n * MS_PER_DAY).toISOString().slice(0, 10);

export const addMonths = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

export const mondayOf = (dateStr) => {
    const dow = (new Date(utcMs(dateStr)).getUTCDay() + 6) % 7; // Monday = 0
    return addDays(dateStr, -dow);
};

const daysBetween = (a, b) => Math.round((utcMs(b) - utcMs(a)) / MS_PER_DAY);

const isValidDate = (s) => {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
    const ms = utcMs(s);
    return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === s; // rejects 2026-02-30 etc.
};

// Turns the dashboard's query-string filter into a concrete window.
//   daily   -> last 30 days, one bar per day
//   weekly  -> last 12 weeks (Mon-Sun), one bar per week
//   monthly -> a calendar year (default: this year), one bar per month
//   yearly  -> up to the last 10 years, one bar per year
//   custom  -> from/to (inclusive); per day up to 62 days, per month beyond that
// Bad custom input never throws — it falls back to monthly and sets `warning`.
export const resolveWindow = ({ filter, year, from, to } = {}, { today = istToday(), firstOrderYear } = {}) => {
    const currentYear = Number(today.slice(0, 4));
    let warning = null;

    if (filter === 'daily') {
        return { filter, groupBy: 'day', startDate: addDays(today, -29), endDate: today, warning };
    }

    if (filter === 'weekly') {
        return { filter, groupBy: 'day', rollup: 'week', startDate: addDays(mondayOf(today), -77), endDate: today, warning };
    }

    if (filter === 'yearly') {
        const startYear = Math.max(firstOrderYear || currentYear, currentYear - 9);
        return { filter, groupBy: 'year', startDate: `${startYear}-01-01`, endDate: `${currentYear}-12-31`, warning };
    }

    if (filter === 'custom') {
        if (!isValidDate(from) || !isValidDate(to)) warning = 'Please pick a valid start and end date.';
        else if (from > to) warning = 'The start date must be on or before the end date.';
        else if (daysBetween(from, to) > 3660) warning = 'Please choose a range of 10 years or less.';
        else {
            const groupBy = daysBetween(from, to) <= 62 ? 'day' : 'month';
            return { filter, groupBy, startDate: from, endDate: to, warning };
        }
    }

    const requested = Number(year);
    const y = Number.isInteger(requested) && requested >= 2000 && requested <= currentYear ? requested : currentYear;
    return { filter: 'monthly', groupBy: 'month', year: y, startDate: `${y}-01-01`, endDate: `${y}-12-31`, warning };
};

// The ordered list of bucket keys the chart should have — including empty
// ones, so a quiet day or month shows up as zero instead of vanishing.
export const buildBuckets = (win) => {
    const keys = [];
    if (win.rollup === 'week') {
        for (let d = win.startDate; d <= win.endDate; d = addDays(d, 7)) keys.push(d);
    } else if (win.groupBy === 'day') {
        for (let d = win.startDate; d <= win.endDate; d = addDays(d, 1)) keys.push(d);
    } else if (win.groupBy === 'month') {
        for (let m = win.startDate.slice(0, 7); m <= win.endDate.slice(0, 7); m = addMonths(m, 1)) keys.push(m);
    } else {
        for (let y = Number(win.startDate.slice(0, 4)); y <= Number(win.endDate.slice(0, 4)); y += 1) keys.push(String(y));
    }
    return keys;
};

const dayLabel = (d) => `${d.slice(8, 10)} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const longDate = (d) => `${d.slice(8, 10)} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

const labelFor = (key, win) => {
    if (win.rollup === 'week' || win.groupBy === 'day') return dayLabel(key);
    if (win.groupBy === 'month') return monthLabel(key);
    return key;
};

// rows: [{ _id: 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY', revenue, orders }] straight from the aggregation.
// For weekly windows the rows are per-day and get rolled up into Monday-start weeks here.
export const shapeSeries = (win, rows) => {
    const keys = buildBuckets(win);
    const slots = new Map(keys.map((k) => [k, { revenue: 0, orders: 0 }]));

    for (const row of rows) {
        const key = win.rollup === 'week' ? mondayOf(row._id) : row._id;
        const slot = slots.get(key);
        if (slot) {
            slot.revenue += row.revenue;
            slot.orders += row.orders;
        }
    }

    return {
        labels: keys.map((k) => labelFor(k, win)),
        revenue: keys.map((k) => round2(slots.get(k).revenue)),
        orders: keys.map((k) => slots.get(k).orders),
        axisNote: win.rollup === 'week' ? 'Week starting (Monday)' : ''
    };
};

export const describeWindow = (win) => `${longDate(win.startDate)} \u2013 ${longDate(win.endDate)}`;

export const yearOptions = (firstOrderYear, currentYear) => {
    const earliest = Math.max(firstOrderYear || currentYear, 2000);
    const years = [];
    for (let y = currentYear; y >= earliest; y -= 1) years.push(y);
    return years;
};