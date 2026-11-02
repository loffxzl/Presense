// services/admin/salesReportService.js
import * as salesReportRepository from '../../repositories/salesReportRepository.js';
import AppError from '../../utils/AppError.js';

const TYPES = ['daily', 'weekly', 'yearly', 'custom'];
const PAGE_SIZE = 15;

const IST_OFFSET_MS = 330 * 60 * 1000; // India has no daylight saving, so a fixed offset is exact
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 5 * 366;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// "YYYY-MM-DD" as seen in India for a given moment.
const istDateString = (date) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const todayIST = () => istDateString(new Date());

const formatDate = (date) =>
    date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Midnight (India time) at the start of the given day.
const parseDay = (value, label) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
        throw new AppError(`Please choose a valid ${label} date`, 400);
    }
    const d = new Date(`${value}T00:00:00+05:30`);
    // JavaScript quietly turns impossible dates like 2026-02-31 into the next
    // month, so confirm the date reads back as the same day it was given.
    if (Number.isNaN(d.getTime()) || istDateString(d) !== value) {
        throw new AppError(`Please choose a valid ${label} date`, 400);
    }
    return d;
};

// Turns the filter choices into an exact [start, end) window. Validation lives
// here, not in the page, because anything in the URL can be edited by hand.
export const resolveRange = ({ type = 'daily', date, from, to } = {}) => {
    if (!TYPES.includes(type)) throw new AppError('Unknown report type', 400);

    const anchor = date || todayIST();

    if (type === 'daily') {
        const start = parseDay(anchor, 'report');
        return {
            type, date: anchor, from: '', to: '',
            start, end: new Date(start.getTime() + DAY_MS),
            label: formatDate(start), trendFormat: null,
            fileSlug: `daily-${anchor}`
        };
    }

    if (type === 'weekly') {
        // Monday to Sunday, containing the chosen date.
        const day = parseDay(anchor, 'report');
        const dow = new Date(day.getTime() + IST_OFFSET_MS).getUTCDay(); // 0 = Sunday
        const start = new Date(day.getTime() - ((dow + 6) % 7) * DAY_MS);
        const end = new Date(start.getTime() + 7 * DAY_MS);
        return {
            type, date: anchor, from: '', to: '',
            start, end,
            label: `${formatDate(start)} – ${formatDate(new Date(end.getTime() - 1))}`,
            trendFormat: '%Y-%m-%d',
            fileSlug: `weekly-${istDateString(start)}`
        };
    }

    if (type === 'yearly') {
        parseDay(anchor, 'report'); // validates the chosen date
        const year = Number(anchor.slice(0, 4));
        const start = new Date(`${year}-01-01T00:00:00+05:30`);
        const end = new Date(`${year + 1}-01-01T00:00:00+05:30`);
        return {
            type, date: anchor, from: '', to: '',
            start, end, label: String(year), trendFormat: '%Y-%m',
            fileSlug: `yearly-${year}`
        };
    }

    // custom
    const startDay = parseDay(from, 'start');
    const endDay = parseDay(to, 'end');
    if (endDay < startDay) throw new AppError('The end date cannot be before the start date', 400);

    const end = new Date(endDay.getTime() + DAY_MS); // end date is inclusive
    const days = Math.round((end - startDay) / DAY_MS);
    if (days > MAX_RANGE_DAYS) throw new AppError('Please choose a range of 5 years or less', 400);

    return {
        type, date: anchor, from, to,
        start: startDay, end,
        label: `${formatDate(startDay)} – ${formatDate(endDay)}`,
        trendFormat: days <= 92 ? '%Y-%m-%d' : '%Y-%m',
        fileSlug: `custom-${from}_${to}`
    };
};

const shapeSummary = (row) => {
    const s = row || {};
    const orders = s.orders || 0;
    const total = round2(s.total);
    const refunded = round2(s.refunded);
    return {
        orders,
        subtotal: round2(s.subtotal),
        tax: round2(s.tax),
        shipping: round2(s.shipping),
        discount: round2(s.discount),
        couponOrders: s.couponOrders || 0,
        couponDiscount: round2(s.couponDiscount),
        total,
        refunded,
        net: round2(total - refunded),
        averageOrder: orders ? round2(total / orders) : 0
    };
};

const loadReport = async (range) => {
    const match = salesReportRepository.buildSalesMatch(range);

    const [summaryRow, coupons, trend] = await Promise.all([
        salesReportRepository.getSummary(match),
        salesReportRepository.getCouponBreakdown(match),
        range.trendFormat ? salesReportRepository.getTrend(match, range.trendFormat) : Promise.resolve([])
    ]);

    return {
        match,
        range,
        summary: shapeSummary(summaryRow),
        coupons: coupons.map((c) => ({
            code: c._id, orders: c.orders, discount: round2(c.discount), orderAmount: round2(c.orderAmount)
        })),
        trend: trend.map((t) => ({
            period: t._id, orders: t.orders, discount: round2(t.discount), total: round2(t.total)
        }))
    };
};

const queryString = (range) =>
    new URLSearchParams({
        type: range.type,
        date: range.date || '',
        from: range.from || '',
        to: range.to || ''
    }).toString();

// Data for the on-screen page (orders are paged).
export const getReportPage = async (query = {}) => {
    let range;
    let error = '';

    try {
        range = resolveRange(query);
    } catch (err) {
        if (!(err instanceof AppError)) throw err;
        error = err.message; // show the problem on the page and fall back to today
        range = resolveRange({ type: 'daily' });
    }

    const report = await loadReport(range);

    const currentPage = Math.max(1, parseInt(query.page) || 1);
    const totalOrders = report.summary.orders;
    const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
    const page = Math.min(currentPage, totalPages);

    const orders = await salesReportRepository.findOrders(report.match, {
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE
    });

    return {
        range: report.range,
        summary: report.summary,
        coupons: report.coupons,
        trend: report.trend,
        orders,
        currentPage: page,
        totalPages,
        qs: queryString(range),
        error
    };
};

// Data for PDF/Excel: same numbers, but every order and no paging. A bad range
// throws, so a hand-edited download link fails loudly instead of exporting the wrong dates.
export const getReportForDownload = async (query = {}) => {
    const range = resolveRange(query);
    const report = await loadReport(range);
    const orders = await salesReportRepository.findAllOrders(report.match);

    return {
        range: report.range,
        summary: report.summary,
        coupons: report.coupons,
        trend: report.trend,
        orders
    };
};