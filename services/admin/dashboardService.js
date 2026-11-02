import * as dashboardRepository from '../../repositories/dashboardRepository.js';
import {
    resolveWindow,
    shapeSeries,
    describeWindow,
    yearOptions,
    istToday,
    istYearOf,
    istStart,
    addDays,
    round2
} from '../../utils/dashboardRange.js';


const resolveRange = async (query = {}) => {
    const first = await dashboardRepository.findFirstOrderDate();
    const firstOrderYear = first ? istYearOf(first.createdAt) : undefined;

    const win = resolveWindow(query, { firstOrderYear });
    return {
        win,
        firstOrderYear,
        from: istStart(win.startDate),
        to: istStart(addDays(win.endDate, 1))
    };
};

export const getDashboardData = async (query = {}) => {
    const { win, firstOrderYear, from, to } = await resolveRange(query);
    const currentYear = Number(istToday().slice(0, 4));

    // One filter drives everything on the page: chart, summary cards and all three top-10 lists.
    const [bucketRows, totals, topProducts, topCategories, topBrands] = await Promise.all([
        dashboardRepository.salesByBucket(from, to, win.groupBy),
        dashboardRepository.salesSummary(from, to),
        dashboardRepository.topProducts(from, to, 10),
        dashboardRepository.topCategories(from, to, 10),
        dashboardRepository.topBrands(from, to, 10)
    ]);

    const revenue = round2(totals.revenue);


    const ledgerParams = new URLSearchParams({ filter: win.filter });
    if (win.filter === 'monthly') ledgerParams.set('year', win.year);
    if (win.filter === 'custom') {
        ledgerParams.set('from', win.startDate);
        ledgerParams.set('to', win.endDate);
    }

    return {
        filter: win.filter,
        year: win.year || currentYear,
        from: win.startDate,
        to: win.endDate,
        periodLabel: describeWindow(win),
        warning: win.warning,
        yearOptions: yearOptions(firstOrderYear, currentYear),
        summary: {
            revenue,
            orders: totals.orders,
            units: totals.units,
            avgOrderValue: totals.orders ? round2(revenue / totals.orders) : 0
        },
        chart: shapeSeries(win, bucketRows),
        topProducts,
        topCategories,
        topBrands,
        ledgerQuery: ledgerParams.toString()
    };
};


export const getLedgerSource = async (query = {}) => {
    const { win, from, to } = await resolveRange(query);

    return {
        cursor: dashboardRepository.ledgerCursor(from, to),
        periodLabel: describeWindow(win),
        filename: `ledger-${win.startDate}_to_${win.endDate}.pdf`
    };
};