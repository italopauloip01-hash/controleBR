export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

/**
 * Parseia uma string de data no formato YYYY-MM-DD como data LOCAL,
 * evitando o bug de deslocamento de um dia causado pela conversão UTC→local.
 * Use sempre que for exibir ou converter datas vindas do banco de dados.
 */
export const parseDateLocal = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Retorna a data de hoje no formato YYYY-MM-DD usando o horário LOCAL,
 * garantindo que o valor do campo <input type="date"> seja sempre hoje.
 */
export const todayLocalISO = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
