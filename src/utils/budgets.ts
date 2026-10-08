export interface BudgetStatus {
    categoryId: string;
    name: string;
    limit: number;
    spent: number;
    percent: number;
    level: 'ok' | 'warn' | 'over';
}

interface Tx {
    type: string;
    amount: number;
    date: string;
    category_id: string | null;
}

export const budgetLevel = (percent: number): BudgetStatus['level'] => (percent >= 100 ? 'over' : percent >= 80 ? 'warn' : 'ok');

// Gasto do mês (YYYY-MM) por categoria
export function spentByCategory(transactions: Tx[], period: string): Record<string, number> {
    const map: Record<string, number> = {};
    for (const t of transactions) {
        if (t.type !== 'expense' || !t.category_id || !t.date.startsWith(period)) continue;
        map[t.category_id] = (map[t.category_id] || 0) + t.amount;
    }
    return map;
}

export function budgetStatuses(
    budgets: Record<string, number> | undefined,
    transactions: Tx[],
    period: string,
    categoryName: (id: string) => string | undefined,
): BudgetStatus[] {
    if (!budgets) return [];
    const spent = spentByCategory(transactions, period);
    return Object.entries(budgets)
        .filter(([id, limit]) => limit > 0 && categoryName(id))
        .map(([id, limit]) => {
            const value = spent[id] || 0;
            const percent = (value / limit) * 100;
            return { categoryId: id, name: categoryName(id)!, limit, spent: value, percent, level: budgetLevel(percent) };
        })
        .sort((a, b) => b.percent - a.percent);
}
