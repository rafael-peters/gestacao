/* =====================================================
   CALCULOS.JS - Módulo de Cálculos Gestacionais
   Contém toda a lógica matemática para conversões
   
   IMPORTANTE: Este arquivo contém as fórmulas precisas
   baseadas em 280 dias de gestação ÷ 9 meses = ~31.11 dias/mês
   ===================================================== */

// =====================================================
// CONSTANTES - Tabela de Conversão Meses/Semanas
// =====================================================

/**
 * Tabela de limites de dias acumulados por mês
 * Cada mês "comercial" gestacional tem aproximadamente 31.11 dias
 * Arredondamos para valores inteiros: 31, 62, 93, 124, 155, 186, 217, 248, 280
 */
const LIMITES_MESES = [31, 62, 93, 124, 155, 186, 217, 248, 280];

/**
 * Tabela completa de conversão meses para semanas
 * Inclui início e fim de cada mês em semanas+dias
 */
const TABELA_MESES = [
    { mes: 1, diasAcumulados: 31,  semInicio: 0,  diaInicio: 0, semFim: 4,  diaFim: 3, tri: 1 },
    { mes: 2, diasAcumulados: 62,  semInicio: 4,  diaInicio: 3, semFim: 8,  diaFim: 6, tri: 1 },
    { mes: 3, diasAcumulados: 93,  semInicio: 8,  diaInicio: 6, semFim: 13, diaFim: 2, tri: 1 },
    { mes: 4, diasAcumulados: 124, semInicio: 13, diaInicio: 2, semFim: 17, diaFim: 5, tri: 2 },
    { mes: 5, diasAcumulados: 155, semInicio: 17, diaInicio: 5, semFim: 22, diaFim: 1, tri: 2 },
    { mes: 6, diasAcumulados: 186, semInicio: 22, diaInicio: 1, semFim: 26, diaFim: 4, tri: 2 },
    { mes: 7, diasAcumulados: 217, semInicio: 26, diaInicio: 4, semFim: 31, diaFim: 0, tri: 3 },
    { mes: 8, diasAcumulados: 248, semInicio: 31, diaInicio: 0, semFim: 35, diaFim: 3, tri: 3 },
    { mes: 9, diasAcumulados: 280, semInicio: 35, diaInicio: 3, semFim: 40, diaFim: 0, tri: 3 }
];

/**
 * Definição dos trimestres
 */
const TRIMESTRES = [
    { num: 1, diasFim: 93,  semFim: 13, cor: 'rosa' },
    { num: 2, diasFim: 186, semFim: 27, cor: 'roxo' },
    { num: 3, diasFim: 280, semFim: 40, cor: 'azul' }
];

// =====================================================
// FUNÇÕES DE CÁLCULO DE DATAS
// =====================================================

/**
 * Adiciona dias a uma data
 * @param {Date|string} data - Data base
 * @param {number} dias - Número de dias a adicionar (pode ser negativo)
 * @returns {Date} Nova data
 */
function adicionarDias(data, dias) {
    const d = new Date(data);
    d.setDate(d.getDate() + dias);
    return d;
}

/**
 * Calcula a diferença em dias entre duas datas
 * @param {Date|string} dataFim - Data final
 * @param {Date|string} dataInicio - Data inicial
 * @returns {number} Diferença em dias
 */
function diferencaDias(dataFim, dataInicio) {
    const fim = new Date(dataFim);
    const inicio = new Date(dataInicio);
    const diffTime = fim.getTime() - inicio.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formata uma data para exibição (DD/MM/AAAA)
 * @param {Date} data 
 * @returns {string}
 */
function formatarData(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

/**
 * Converte string de data para Date
 * @param {string} dataStr - Data no formato YYYY-MM-DD ou DD/MM/YYYY
 * @returns {Date}
 */
function parseData(dataStr) {
    if (!dataStr) return null;
    
    // Se já é Date, retorna
    if (dataStr instanceof Date) return dataStr;
    
    // Formato YYYY-MM-DD (input type="date")
    if (dataStr.includes('-')) {
        return new Date(dataStr + 'T12:00:00');
    }
    
    // Formato DD/MM/YYYY
    const partes = dataStr.split('/');
    if (partes.length === 3) {
        return new Date(partes[2], partes[1] - 1, partes[0], 12, 0, 0);
    }
    
    return null;
}

// =====================================================
// FUNÇÕES DE CÁLCULO DA DPP
// =====================================================

/**
 * Calcula a DPP (Data Provável do Parto) baseado no método escolhido
 * 
 * Fórmulas:
 * - DUM: DPP = DUM + 280 dias
 * - DPP: DPP = a própria data informada
 * - Ultrassom: DPP = data_exame + 280 - (semanas*7 + dias)
 * 
 * @param {string} metodo - 'dum', 'dpp' ou 'ultrassom'
 * @param {Object} dados - Dados conforme o método
 * @returns {Date|null} Data provável do parto
 */
function calcularDPP(metodo, dados) {
    switch (metodo) {
        case 'dum':
            // DPP = DUM + 280 dias
            if (!dados.dum) return null;
            return adicionarDias(parseData(dados.dum), 280);
        
        case 'dpp':
            // DPP já informada
            if (!dados.dpp) return null;
            return parseData(dados.dpp);
        
        case 'ultrassom':
            // DPP = data_exame + 280 - (semanas*7 + dias)
            if (!dados.dataExame || dados.semanas === undefined) return null;
            const diasIG = (dados.semanas * 7) + (dados.dias || 0);
            return adicionarDias(parseData(dados.dataExame), 280 - diasIG);
        
        default:
            return null;
    }
}

/**
 * Calcula a DUM (Data da Última Menstruação) a partir da DPP
 * @param {Date} dpp - Data provável do parto
 * @returns {Date}
 */
function calcularDUM(dpp) {
    return adicionarDias(dpp, -280);
}

// =====================================================
// FUNÇÕES DE CÁLCULO DA IDADE GESTACIONAL
// =====================================================

/**
 * Calcula a idade gestacional em dias a partir da DPP
 * @param {Date} dpp - Data provável do parto
 * @param {Date} dataReferencia - Data de referência (default: hoje)
 * @returns {number} Dias de gestação
 */
function calcularDiasGestacao(dpp, dataReferencia = new Date()) {
    const diasAteParto = diferencaDias(dpp, dataReferencia);
    return 280 - diasAteParto;
}

/**
 * Converte dias totais em semanas e dias
 * @param {number} totalDias 
 * @returns {Object} { semanas, dias }
 */
function diasParaSemanasEDias(totalDias) {
    return {
        semanas: Math.floor(totalDias / 7),
        dias: totalDias % 7
    };
}

/**
 * Converte semanas e dias em dias totais
 * @param {number} semanas 
 * @param {number} dias 
 * @returns {number}
 */
function semanasEDiasParaDias(semanas, dias = 0) {
    return (semanas * 7) + dias;
}

// =====================================================
// FUNÇÕES DE CONVERSÃO MESES/TRIMESTRES
// =====================================================

/**
 * Encontra em qual mês gestacional está baseado nos dias
 * @param {number} dias - Total de dias de gestação
 * @returns {number} Número do mês (1-9)
 */
function encontrarMes(dias) {
    for (let i = 0; i < LIMITES_MESES.length; i++) {
        if (dias <= LIMITES_MESES[i]) {
            return i + 1;
        }
    }
    return 9;
}

/**
 * Encontra em qual trimestre está baseado nos dias
 * @param {number} dias - Total de dias de gestação
 * @returns {number} Número do trimestre (1-3)
 */
function encontrarTrimestre(dias) {
    for (const tri of TRIMESTRES) {
        if (dias <= tri.diasFim) {
            return tri.num;
        }
    }
    return 3;
}

/**
 * Calcula quantos meses completos + semanas extras + dias extras
 * 
 * Exemplo: 139 dias
 * - 4 meses completos (124 dias)
 * - 15 dias restantes = 2 semanas + 1 dia
 * - Resultado: "4 meses, 2 semanas e 1 dia"
 * 
 * @param {number} totalDias 
 * @returns {Object} { mesesCompletos, semanasExtras, diasExtras }
 */
function calcularMesesCompletos(totalDias) {
    let mesesCompletos = 0;
    
    // Encontrar quantos meses completos
    for (let i = 0; i < LIMITES_MESES.length; i++) {
        if (totalDias > LIMITES_MESES[i]) {
            mesesCompletos = i + 1;
        } else {
            break;
        }
    }
    
    // Calcular dias restantes após meses completos
    const diasBase = mesesCompletos > 0 ? LIMITES_MESES[mesesCompletos - 1] : 0;
    const diasRestantes = totalDias - diasBase;
    
    return {
        mesesCompletos,
        semanasExtras: Math.floor(diasRestantes / 7),
        diasExtras: diasRestantes % 7
    };
}

// =====================================================
// FUNÇÃO PRINCIPAL DE CONVERSÃO
// =====================================================

/**
 * Função principal que converte qualquer entrada em resultado completo
 * 
 * @param {number} totalDias - Total de dias de gestação
 * @returns {Object} Objeto com todas as informações calculadas
 */
function converterIdadeGestacional(totalDias) {
    // Validação
    if (totalDias < 0) totalDias = 0;
    if (totalDias > 300) totalDias = 300; // Limite de segurança
    
    // Semanas e dias
    const { semanas, dias } = diasParaSemanasEDias(totalDias);
    
    // Mês atual (em qual mês está)
    const mesAtual = encontrarMes(totalDias);
    
    // Trimestre
    const trimestre = encontrarTrimestre(totalDias);
    
    // Meses completos + extras
    const { mesesCompletos, semanasExtras, diasExtras } = calcularMesesCompletos(totalDias);
    
    // Dados do mês atual (para mostrar range)
    const dadosMes = TABELA_MESES[mesAtual - 1];
    
    // Porcentagem de progresso
    const progresso = (totalDias / 280) * 100;
    
    return {
        // Valores básicos
        totalDias,
        semanas,
        dias,
        
        // Mês atual (em qual mês está, não quantos completou)
        mesAtual,
        
        // Meses completos com breakdown
        mesesCompletos,
        semanasExtras,
        diasExtras,
        
        // Trimestre
        trimestre,
        trimestreCor: TRIMESTRES[trimestre - 1].cor,
        
        // Dados do mês para mostrar range
        dadosMes,
        
        // Progresso percentual
        progresso: Math.min(100, Math.max(0, progresso)),
        
        // Referências às tabelas (útil para renderização)
        tabelaMeses: TABELA_MESES,
        trimestres: TRIMESTRES
    };
}

// =====================================================
// FUNÇÕES AUXILIARES DE PERÍODO DE EXAMES
// =====================================================

/**
 * Determina o período de exames baseado na semana
 * @param {number} semana - Semana de gestação
 * @returns {string} Chave do período (ex: "18-22")
 */
function obterPeriodoExame(semana) {
    if (semana <= 4) return '1-4';
    if (semana <= 8) return '5-8';
    if (semana <= 13) return '9-13';
    if (semana <= 17) return '14-17';
    if (semana <= 22) return '18-22';
    if (semana <= 27) return '23-27';
    if (semana <= 31) return '28-31';
    if (semana <= 35) return '32-35';
    return '36-40';
}

// =====================================================
// VALIDAÇÕES
// =====================================================

/**
 * Valida se uma data de DUM é válida
 * @param {Date|string} dum 
 * @returns {Object} { valido, mensagem }
 */
function validarDUM(dum) {
    const data = parseData(dum);
    if (!data) {
        return { valido: false, mensagem: 'Data inválida' };
    }
    
    const hoje = new Date();
    const diffDias = diferencaDias(hoje, data);
    
    if (diffDias < 0) {
        return { valido: false, mensagem: 'A DUM não pode ser no futuro' };
    }
    
    if (diffDias > 300) {
        return { valido: false, mensagem: 'A DUM está muito antiga (mais de 300 dias)' };
    }
    
    return { valido: true, mensagem: '' };
}

/**
 * Valida se uma data de DPP é válida
 * @param {Date|string} dpp 
 * @returns {Object} { valido, mensagem }
 */
function validarDPP(dpp) {
    const data = parseData(dpp);
    if (!data) {
        return { valido: false, mensagem: 'Data inválida' };
    }
    
    const hoje = new Date();
    const diffDias = diferencaDias(data, hoje);
    
    if (diffDias < -20) {
        return { valido: false, mensagem: 'A DPP já passou há mais de 20 dias' };
    }
    
    if (diffDias > 300) {
        return { valido: false, mensagem: 'A DPP está muito distante (mais de 300 dias)' };
    }
    
    return { valido: true, mensagem: '' };
}

/**
 * Valida semanas e dias de IG
 * @param {number} semanas 
 * @param {number} dias 
 * @returns {Object} { valido, mensagem }
 */
function validarIG(semanas, dias = 0) {
    if (semanas < 0 || semanas > 45) {
        return { valido: false, mensagem: 'Semanas deve ser entre 0 e 45' };
    }
    
    if (dias < 0 || dias > 6) {
        return { valido: false, mensagem: 'Dias deve ser entre 0 e 6' };
    }
    
    return { valido: true, mensagem: '' };
}

// =====================================================
// EXPORTAÇÃO DO MÓDULO
// =====================================================

// Se estiver em ambiente de módulo ES6
if (typeof window !== 'undefined') {
    window.CalculosGestacionais = {
        // Constantes
        LIMITES_MESES,
        TABELA_MESES,
        TRIMESTRES,
        
        // Funções de data
        adicionarDias,
        diferencaDias,
        formatarData,
        parseData,
        
        // Cálculos principais
        calcularDPP,
        calcularDUM,
        calcularDiasGestacao,
        diasParaSemanasEDias,
        semanasEDiasParaDias,
        
        // Conversões
        encontrarMes,
        encontrarTrimestre,
        calcularMesesCompletos,
        converterIdadeGestacional,
        
        // Auxiliares
        obterPeriodoExame,
        
        // Validações
        validarDUM,
        validarDPP,
        validarIG
    };
}
