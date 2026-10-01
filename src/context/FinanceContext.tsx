import React, { createContext, useState, useEffect, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import type { Database } from '../types/supabase';

type Account = Database['public']['Tables']['accounts']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type CreditCard = Database['public']['Tables']['credit_cards']['Row'];
type Goal = Database['public']['Tables']['goals']['Row'];
type Investment = Database['public']['Tables']['investments']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

interface FinanceContextType {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    creditCards: CreditCard[];
    goals: Goal[];
    investments: Investment[];
    vehicles: Vehicle[];
    categoryMap: Record<string, Category>;
    isLoading: boolean;
    selectedMonth: number;
    setSelectedMonth: (month: number) => void;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    refreshData: () => Promise<void>;
}

export const FinanceContext = createContext<FinanceContextType>({
    accounts: [],
    categories: [],
    transactions: [],
    creditCards: [],
    goals: [],
    investments: [],
    vehicles: [],
    categoryMap: {},
    isLoading: true,
    selectedMonth: new Date().getMonth(),
    setSelectedMonth: () => { },
    selectedYear: new Date().getFullYear(),
    setSelectedYear: () => { },
    refreshData: async () => { },
});

export const useFinance = () => useContext(FinanceContext);

export function FinanceProvider({ children }: PropsWithChildren) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { user } = useAuth();

    const fetchData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [accsRes, catsRes, transRes, cardsRes, goalsRes, invRes, vehiclesRes] = await Promise.all([
                supabase.from('accounts').select('*').order('created_at', { ascending: false }),
                supabase.from('categories').select('*').order('name'),
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('credit_cards').select('*').order('created_at', { ascending: false }),
                supabase.from('goals').select('*').order('created_at', { ascending: false }),
                supabase.from('investments').select('*').order('created_at', { ascending: false }),
                supabase.from('vehicles').select('*').order('created_at', { ascending: false })
            ]);

            if (catsRes.data) setCategories(catsRes.data);
            if (accsRes.data) setAccounts(accsRes.data);
            if (transRes.data) setTransactions(transRes.data);
            if (cardsRes.data) setCreditCards(cardsRes.data);
            if (goalsRes.data) setGoals(goalsRes.data);
            if (invRes.data) setInvestments(invRes.data);
            if (vehiclesRes.data) setVehicles(vehiclesRes.data);

        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            setAccounts([]);
            setCategories([]);
            setTransactions([]);
            setCreditCards([]);
            setGoals([]);
            setInvestments([]);
            setVehicles([]);
            setIsLoading(false);
            return;
        }

        fetchData();

        // Subscribe to real-time changes
        const channels = [
            supabase.channel('public:accounts').on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (p) => {
                if (p.eventType === 'INSERT') setAccounts(prev => [p.new as Account, ...prev]);
                if (p.eventType === 'UPDATE') setAccounts(prev => prev.map(a => a.id === p.new.id ? p.new as Account : a));
                if (p.eventType === 'DELETE') setAccounts(prev => prev.filter(a => a.id !== p.old.id));
            }),
            supabase.channel('public:categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (p) => {
                if (p.eventType === 'INSERT') setCategories(prev => [...prev, p.new as Category].sort((a, b) => a.name.localeCompare(b.name)));
                if (p.eventType === 'UPDATE') setCategories(prev => prev.map(c => c.id === p.new.id ? p.new as Category : c).sort((a, b) => a.name.localeCompare(b.name)));
                if (p.eventType === 'DELETE') setCategories(prev => prev.filter(c => c.id !== p.old.id));
            }),
            supabase.channel('public:transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (p) => {
                if (p.eventType === 'INSERT') setTransactions(prev => [p.new as Transaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                if (p.eventType === 'UPDATE') setTransactions(prev => prev.map(t => t.id === p.new.id ? p.new as Transaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                if (p.eventType === 'DELETE') setTransactions(prev => prev.filter(t => t.id !== p.old.id));
            }),
            supabase.channel('public:credit_cards').on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, (p) => {
                if (p.eventType === 'INSERT') setCreditCards(prev => [p.new as CreditCard, ...prev]);
                if (p.eventType === 'UPDATE') setCreditCards(prev => prev.map(c => c.id === p.new.id ? p.new as CreditCard : c));
                if (p.eventType === 'DELETE') setCreditCards(prev => prev.filter(c => c.id !== p.old.id));
            }),
            supabase.channel('public:goals').on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, (p) => {
                if (p.eventType === 'INSERT') setGoals(prev => [p.new as Goal, ...prev]);
                if (p.eventType === 'UPDATE') setGoals(prev => prev.map(g => g.id === p.new.id ? p.new as Goal : g));
                if (p.eventType === 'DELETE') setGoals(prev => prev.filter(g => g.id !== p.old.id));
            }),
            supabase.channel('public:investments').on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, (p) => {
                if (p.eventType === 'INSERT') setInvestments(prev => [p.new as Investment, ...prev]);
                if (p.eventType === 'UPDATE') setInvestments(prev => prev.map(i => i.id === p.new.id ? p.new as Investment : i));
                if (p.eventType === 'DELETE') setInvestments(prev => prev.filter(i => i.id !== p.old.id));
            }),
            supabase.channel('public:vehicles').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (p) => {
                if (p.eventType === 'INSERT') setVehicles(prev => [p.new as Vehicle, ...prev]);
                if (p.eventType === 'UPDATE') setVehicles(prev => prev.map(v => v.id === p.new.id ? p.new as Vehicle : v));
                if (p.eventType === 'DELETE') setVehicles(prev => prev.filter(v => v.id !== p.old.id));
            })
        ];

        channels.forEach(channel => channel.subscribe());

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [user]);

    const categoryMap = React.useMemo(() => {
        return categories.reduce((acc, cat) => {
            acc[cat.id] = cat;
            return acc;
        }, {} as Record<string, Category>);
    }, [categories]);

    const value = React.useMemo(() => ({
        accounts, categories, transactions, creditCards, goals, investments, vehicles, categoryMap, isLoading,
        selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, refreshData: fetchData
    }), [accounts, categories, transactions, creditCards, goals, investments, vehicles, categoryMap, isLoading, selectedMonth, selectedYear]);

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
}
