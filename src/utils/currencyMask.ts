/**
 * Utility to mask raw string input into a Brazilian Real (R$) currency format.
 * Example: "1234" becomes "12,34" (and can be displayed with R$)
 */
export const formatCurrencyInput = (value: string): string => {
    // Remove everything that's not a digit
    const digits = value.replace(/\D/g, '');
    
    // Convert to number (cents)
    const amount = parseInt(digits || '0', 10) / 100;
    
    // Format as currency string (without the R$ symbol for easier state management inside the input)
    return amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Converts a masked string back to a float number for database storage.
 * Example: "12,34" becomes 12.34
 */
export const parseCurrencyToFloat = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
};
