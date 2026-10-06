export const EXPENSE_CATEGORY_MAP: Record<string, string[]> = {
  'Alimentação': ['mercado', 'supermercado', 'ifood', 'padaria', 'restaurante', 'lanche', 'comida', 'acougue', 'açougue', 'feira', 'pizza', 'hamburguer', 'sorvete', 'alimentacao', 'alimentação', 'hortifruti', 'bebida', 'bar', 'mcdonalds', 'burger', 'extra', 'carrefour', 'pao de acucar', 'assai', 'dia', 'zaffari', 'vinhos', 'pub'],
  'Transporte': ['posto', 'gasolina', 'etanol', 'uber', '99', 'onibus', 'metrô', 'carro', 'mecânico', 'estacionamento', 'pedágio', 'transporte', 'combustivel', 'combustível', 'oficina', 'pneu', 'manutencao', 'manutenção', 'ipva', 'seguro auto', 'moto', 'aluguel de carro', 'oficina'],
  'Moradia': ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'gás', 'gas', 'internet', 'iptu', 'energia', 'casa', 'moradia', 'reforma', 'material de construcao', 'limpeza', 'leroy', 'mobly', 'etna'],
  'Saúde': ['farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico', 'consulta', 'exame', 'dentista', 'unimed', 'saude', 'saúde', 'hospital', 'psicologo', 'terapia', 'droga raia', 'drogasil', 'pague menos'],
  'Lazer': ['cinema', 'netflix', 'spotify', 'jogo', 'festa', 'show', 'ingresso', 'viagem', 'lazer', 'passeio', 'clube', 'férias', 'ferias', 'teatro', 'steam', 'playstation', 'xbox'],
  'Educação': ['curso', 'faculdade', 'escola', 'livro', 'material', 'educacao', 'educação', 'mensalidade', 'creche', 'idioma', 'ingles', 'inglês', 'udemy', 'alura', 'hotmart'],
  'Pets': ['pet', 'ração', 'racao', 'veterinário', 'veterinario', 'cachorro', 'gato', 'banho e tosa', 'petz', 'cobasi'],
  'Vestuário': ['roupa', 'sapato', 'tênis', 'tenis', 'camisa', 'calça', 'calca', 'vestuario', 'vestuário', 'shopping', 'loja', 'zara', 'renner', 'cea', 'riachuelo', 'nike', 'adidas'],
  'Beleza': ['cabelo', 'barbearia', 'salão', 'salao', 'unha', 'beleza', 'maquiagem', 'cosmético', 'cosmetico', 'estetica', 'estética', 'boticario', 'natura', 'sephora'],
  'Impostos e Taxas': ['imposto', 'taxa', 'tarifa', 'juros', 'multa', 'irpf', 'banco', 'nubank', 'itau', 'bradesco', 'santander'],
  'Assinaturas': ['assinatura', 'amazon', 'prime', 'hbo', 'disney', 'youtube', 'mensalidade', 'gympass', 'adobe']
};

export const INCOME_CATEGORY_MAP: Record<string, string[]> = {
  'Salário': ['salário', 'salario', 'pagamento', 'adiantamento', 'vale', 'bônus', 'bonus', 'holerite', 'decimo terceiro', '13º'],
  'Rendimentos': ['rendimento', 'juros', 'dividendo', 'lucro', 'venda', 'investimento', 'cdb', 'tesouro', 'ações', 'acoes', 'fii'],
  'Freelance': ['freela', 'freelance', 'projeto', 'bico', 'serviço', 'servico'],
  'Presentes': ['presente', 'doação', 'doacao', 'pix', 'transferencia', 'transferência'],
  'Cashback': ['cashback', 'reembolso', 'devolução', 'devolucao', 'estorno']
};

export function inferCategoryName(description: string, type: 'expense' | 'revenue'): string {
  const map = type === 'expense' ? EXPENSE_CATEGORY_MAP : INCOME_CATEGORY_MAP;
  const desc = description.toLowerCase().trim();
  
  for (const [categoryName, keywords] of Object.entries(map)) {
    if (keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(desc)) return true;
      if (desc.includes(keyword)) return true;
      return false;
    })) {
      return categoryName;
    }
  }
  
  return "Outros";
}


export const FUEL_KEYWORDS = ['posto', 'gasolina', 'etanol', 'álcool', 'alcool', 'diesel', 'gnv', 'abastecimento', 'combustivel', 'combustível'];
export const VEHICLE_MAINTENANCE_KEYWORDS = ['mecanic', 'mecânic', 'carro', 'veiculo', 'veículo', 'manutenc', 'manutenç', 'oficina', 'pneu', 'óleo', 'oleo', 'ipva', 'seguro auto', 'moto', 'lavar', 'lava jato', 'pedagio', 'pedágio', 'estacionamento', 'multa'];

export function isCarRelated(description: string, categoryName: string = ''): boolean {
  const text = `${description} ${categoryName}`.toLowerCase();
  return [...FUEL_KEYWORDS, ...VEHICLE_MAINTENANCE_KEYWORDS].some(k => text.includes(k));
}

export function isFuelRelated(description: string, categoryName: string = ''): boolean {
  const text = `${description} ${categoryName}`.toLowerCase();
  return FUEL_KEYWORDS.some(k => text.includes(k));
}
