// Leitura de extratos bancários exportados pelo app/site do banco.
// OFX (padrão de quase todos os bancos) e CSV (Nubank, Inter, C6, planilhas genéricas).

export interface ImportedTx {
    date: string; // YYYY-MM-DD
    description: string;
    amount: number; // sempre positivo
    type: 'expense' | 'revenue';
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Converte "R$ -1.234,56", "-1234.56", "1,234.56" etc. em número. */
export function parseAmount(raw: string): number {
    let s = raw.replace(/[R$\s]/g, ''); // \s também cobre o espaço não separável
    const negative = /^\(.*\)$/.test(s) || s.includes('-');
    s = s.replace(/[()+-]/g, '');
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
        // o último separador é o decimal
        s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (lastComma > -1) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, ''); // "1.234" = mil duzentos e trinta e quatro
    }
    const value = parseFloat(s);
    return isNaN(value) ? NaN : negative ? -value : value;
}

/** Aceita dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd e aaaammdd. */
export function parseDate(raw: string): string | null {
    const s = raw.trim();
    let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) {
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return null;
}

const toTx = (date: string | null, description: string, amount: number): ImportedTx | null => {
    if (!date || isNaN(amount) || amount === 0) return null;
    return { date, description: description.replace(/\s+/g, ' ').trim() || 'Lançamento importado', amount: Math.abs(amount), type: amount < 0 ? 'expense' : 'revenue' };
};

export function parseOFX(text: string): ImportedTx[] {
    const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'))?.[1]?.trim() || '';
    return text.split(/<STMTTRN>/i).slice(1)
        .map(block => toTx(parseDate(tag(block, 'DTPOSTED')), tag(block, 'MEMO') || tag(block, 'NAME'), parseAmount(tag(block, 'TRNAMT'))))
        .filter((t): t is ImportedTx => t !== null);
}

function splitCsvLine(line: string, sep: string): string[] {
    const cells: string[] = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
        } else if (c === sep && !quoted) {
            cells.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    cells.push(cur);
    return cells.map(c => c.trim());
}

export function parseCSV(text: string): ImportedTx[] {
    // \s também remove o BOM do início do arquivo
    const lines = text.replace(/^\s+/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    // Cabeçalho: primeira linha que tenha coluna de data e de valor
    const headerIndex = lines.findIndex(l => /data|date/i.test(normalize(l)) && /valor|amount|quantia|debito|credito/i.test(normalize(l)));
    if (headerIndex < 0) return [];
    const headerLine = lines[headerIndex];
    const sep = (headerLine.match(/;/g) || []).length >= (headerLine.match(/,/g) || []).length ? ';' : ',';
    const header = splitCsvLine(headerLine, sep).map(normalize);

    const find = (...keys: string[]) => header.findIndex(h => keys.some(k => h.includes(k)));
    const iDate = find('data', 'date');
    const iDesc = find('descri', 'title', 'historico', 'lancamento', 'estabelecimento', 'memo', 'detalhe');
    const iAmount = find('valor', 'amount', 'quantia');
    const iDebit = find('debito', 'saida');
    const iCredit = find('credito', 'entrada');
    if (iDate < 0 || (iAmount < 0 && iDebit < 0 && iCredit < 0)) return [];

    // Fatura de cartão do Nubank (date,title,amount): valor positivo é compra
    const isCardBill = header.includes('title') && header.includes('amount');

    return lines.slice(headerIndex + 1).map(line => {
        const cells = splitCsvLine(line, sep);
        let amount: number;
        if (iAmount >= 0) {
            amount = parseAmount(cells[iAmount] || '');
            if (isCardBill) amount = -amount;
        } else {
            const debit = Math.abs(parseAmount(cells[iDebit] || '') || 0);
            const credit = Math.abs(parseAmount(cells[iCredit] || '') || 0);
            amount = credit - debit;
        }
        return toTx(parseDate(cells[iDate] || ''), iDesc >= 0 ? cells[iDesc] || '' : '', amount);
    }).filter((t): t is ImportedTx => t !== null);
}

export function parseStatement(fileName: string, text: string): ImportedTx[] {
    if (/\.ofx$/i.test(fileName) || /<OFX>|<STMTTRN>/i.test(text)) return parseOFX(text);
    return parseCSV(text);
}
