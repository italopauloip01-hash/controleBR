import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useFinance } from './FinanceContext';

interface GamificationContextType {
    level: number;
    currentXP: number;
    xpForNextLevel: number;
    progressPercentage: number;
    rankName: string;
}

export const GamificationContext = createContext<GamificationContextType>({
    level: 1,
    currentXP: 0,
    xpForNextLevel: 100,
    progressPercentage: 0,
    rankName: 'Iniciante',
});

export const useGamification = () => useContext(GamificationContext);

export function GamificationProvider({ children }: PropsWithChildren) {
    const { transactions, goals, investments, isLoading } = useFinance();
    // XP constants
    const XP_PER_TRANSACTION = 10;
    const XP_PER_GOAL = 50;
    const XP_PER_INVESTMENT = 50;

    const { currentXP, level } = useMemo(() => {
        if (isLoading) return { currentXP: 0, level: 1 };

        // Calculate total XP based on user interactions
        const totalTransactionsXP = transactions.length * XP_PER_TRANSACTION;
        const totalGoalsXP = goals.length * XP_PER_GOAL;
        const totalInvestmentsXP = investments.length * XP_PER_INVESTMENT;

        const calculatedXP = totalTransactionsXP + totalGoalsXP + totalInvestmentsXP;

        // Level formula: Level = Math.floor(Math.sqrt(XP / 100)) + 1
        const calculatedLevel = Math.floor(Math.sqrt(calculatedXP / 100)) + 1;
        
        return { currentXP: calculatedXP, level: calculatedLevel };
    }, [transactions.length, goals.length, investments.length, isLoading]);

    // Calculate XP needed for NEXT level
    // NextLevel = currentLevel + 1
    // RequiredXP = (NextLevel - 1)^2 * 100
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;

    // Progress percentage
    const xpIntoLevel = currentXP - xpForCurrentLevel;
    const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = xpNeededForLevelUp > 0 ? (xpIntoLevel / xpNeededForLevelUp) * 100 : 100;

    const getRankName = (currLevel: number) => {
        if (currLevel < 5) return 'Investidor Iniciante';
        if (currLevel < 10) return 'Gerente Inteligente';
        if (currLevel < 15) return 'Mestre das Finanças';
        if (currLevel < 25) return 'Barão do Dinheiro';
        return 'Líder Supremo';
    };

    return (
        <GamificationContext.Provider value={{
            level,
            currentXP,
            xpForNextLevel,
            progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
            rankName: getRankName(level),
        }}>
            {children}
        </GamificationContext.Provider>
    );
}
