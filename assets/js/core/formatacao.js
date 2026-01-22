/* =====================================================
   FORMATACAO.JS - Módulo de Formatação de Textos
   Singular/plural, omissão de zeros, textos amigáveis
   ===================================================== */

// =====================================================
// FORMATAÇÃO DE SINGULAR/PLURAL
// =====================================================

/**
 * Retorna a forma correta (singular ou plural) baseado no número
 * @param {number} numero - Quantidade
 * @param {string} singular - Forma singular
 * @param {string} plural - Forma plural (opcional, adiciona 's' se não informado)
 * @returns {string} Número + palavra formatada
 */
function pluralizar(numero, singular, plural = null) {
    if (plural === null) {
        plural = singular + 's';
    }
    
    return numero === 1 
        ? `${numero} ${singular}` 
        : `${numero} ${plural}`;
}

// =====================================================
// FORMATAÇÃO DE SEMANAS E DIAS
// =====================================================

/**
 * Formata semanas e dias no formato "Xs+Yd" ou "X semanas"
 * @param {number} semanas 
 * @param {number} dias 
 * @param {boolean} formato curto - Se true, usa "20s+3d", se false, usa "20 semanas e 3 dias"
 * @returns {string}
 */
function formatarSemanasEDias(semanas, dias, formatoCurto = false) {
    if (formatoCurto) {
        // Formato curto: 20s+3d ou 20s
        if (dias === 0) {
            return `${semanas}s`;
        }
        return `${semanas}s+${dias}d`;
    }
    
    // Formato longo
    if (dias === 0) {
        return pluralizar(semanas, 'semana');
    }
    
    return `${pluralizar(semanas, 'semana')} e ${pluralizar(dias, 'dia')}`;
}

/**
 * Formata o range de um mês (ex: "17s+5d a 22s+1d")
 * @param {Object} dadosMes - Objeto com semInicio, diaInicio, semFim, diaFim
 * @returns {string}
 */
function formatarRangeMes(dadosMes) {
    const inicio = formatarSemanasEDias(dadosMes.semInicio, dadosMes.diaInicio, true);
    const fim = formatarSemanasEDias(dadosMes.semFim, dadosMes.diaFim, true);
    return `${inicio} a ${fim}`;
}

// =====================================================
// FORMATAÇÃO DE MESES COMERCIAIS
// =====================================================

/**
 * Formata meses completos com semanas e dias extras
 * Omite partes com valor zero
 * 
 * Exemplos:
 * - (4, 2, 1) → "4 meses, 2 semanas e 1 dia"
 * - (4, 0, 2) → "4 meses e 2 dias"
 * - (0, 3, 5) → "3 semanas e 5 dias"
 * - (5, 0, 0) → "5 meses"
 * 
 * @param {number} meses - Meses completos
 * @param {number} semanas - Semanas extras
 * @param {number} dias - Dias extras
 * @returns {string}
 */
function formatarMesesCompletos(meses, semanas, dias) {
    const partes = [];
    
    // Meses (sempre mostrar se > 0)
    if (meses > 0) {
        partes.push(pluralizar(meses, 'mês', 'meses'));
    }
    
    // Semanas (omitir se 0)
    if (semanas > 0) {
        partes.push(pluralizar(semanas, 'semana'));
    }
    
    // Dias (omitir se 0)
    if (dias > 0) {
        partes.push(pluralizar(dias, 'dia'));
    }
    
    // Se tudo é zero
    if (partes.length === 0) {
        return '0 dias';
    }
    
    // Uma parte: retorna direto
    if (partes.length === 1) {
        return partes[0];
    }
    
    // Duas partes: junta com "e"
    if (partes.length === 2) {
        return partes.join(' e ');
    }
    
    // Três partes: vírgula e "e" antes da última
    const ultima = partes.pop();
    return partes.join(', ') + ' e ' + ultima;
}

/**
 * Versão compacta da formatação de meses
 * Exemplo: "4m + 2sem + 1d"
 * 
 * @param {number} meses 
 * @param {number} semanas 
 * @param {number} dias 
 * @returns {string}
 */
function formatarMesesCompacto(meses, semanas, dias) {
    const partes = [];
    
    if (meses > 0) partes.push(`${meses}m`);
    if (semanas > 0) partes.push(`${semanas}sem`);
    if (dias > 0) partes.push(`${dias}d`);
    
    if (partes.length === 0) return '0d';
    
    return partes.join(' + ');
}

// =====================================================
// FORMATAÇÃO DE TRIMESTRE
// =====================================================

/**
 * Formata o número do trimestre por extenso
 * @param {number} trimestre - 1, 2 ou 3
 * @returns {string} "1º trimestre", "2º trimestre" ou "3º trimestre"
 */
function formatarTrimestre(trimestre) {
    return `${trimestre}º trimestre`;
}

/**
 * Retorna descrição do trimestre
 * @param {number} trimestre 
 * @returns {string}
 */
function descricaoTrimestre(trimestre) {
    const descricoes = {
        1: 'Formação dos órgãos',
        2: 'Crescimento e desenvolvimento',
        3: 'Maturação e preparação para o parto'
    };
    return descricoes[trimestre] || '';
}

// =====================================================
// FORMATAÇÃO DO MÊS
// =====================================================

/**
 * Formata o número do mês por extenso
 * @param {number} mes - 1 a 9
 * @returns {string} "1º mês", "2º mês", etc.
 */
function formatarMes(mes) {
    return `${mes}º mês`;
}

// =====================================================
// MENSAGENS E EXPLICAÇÕES
// =====================================================

/**
 * Gera a mensagem explicativa sobre mês atual vs meses completos
 * @param {number} mesAtual - Em qual mês está (1-9)
 * @param {number} mesesCompletos - Quantos meses completou
 * @returns {string}
 */
function gerarExplicacao(mesAtual, mesesCompletos) {
    if (mesesCompletos === mesAtual) {
        return `Completou exatamente <strong>${mesesCompletos} ${mesesCompletos === 1 ? 'mês' : 'meses'}</strong> de gestação.`;
    }
    
    if (mesAtual === 1) {
        return `Está no <strong>1º mês</strong>, ainda não completou 1 mês.`;
    }
    
    return `Está no <strong>${mesAtual}º mês</strong>, mas ainda não completou ${mesAtual} meses.`;
}

/**
 * Gera mensagem de status baseado na semana
 * @param {number} semanas 
 * @returns {string}
 */
function gerarStatusGestacao(semanas) {
    if (semanas < 4) {
        return 'Início da gestação';
    }
    if (semanas < 12) {
        return 'Período de formação dos órgãos';
    }
    if (semanas < 14) {
        return 'Final do primeiro trimestre';
    }
    if (semanas < 20) {
        return 'Início do segundo trimestre';
    }
    if (semanas < 28) {
        return 'Período de crescimento acelerado';
    }
    if (semanas < 37) {
        return 'Preparação para o nascimento';
    }
    if (semanas < 40) {
        return 'Gestação a termo - pode nascer a qualquer momento';
    }
    if (semanas === 40) {
        return 'Data provável do parto';
    }
    return 'Pós-datismo - procure seu médico';
}

/**
 * Gera mensagem sobre o que está acontecendo nesta semana
 * @param {number} semanas 
 * @returns {Object} { titulo, descricao }
 */
function infoSemana(semanas) {
    const infos = {
        4: { titulo: 'Implantação', descricao: 'O embrião está se implantando no útero' },
        6: { titulo: 'Coração batendo', descricao: 'O coração do bebê já pode ser visto no ultrassom' },
        8: { titulo: 'Primeiros movimentos', descricao: 'O embrião começa a se mover (ainda não sentido pela mãe)' },
        12: { titulo: 'Final do 1º trimestre', descricao: 'Todos os órgãos principais estão formados' },
        16: { titulo: 'Movimentos perceptíveis', descricao: 'A mãe pode começar a sentir o bebê se mexer' },
        20: { titulo: 'Metade da gestação', descricao: 'Período ideal para o ultrassom morfológico' },
        24: { titulo: 'Viabilidade', descricao: 'O bebê teria chance de sobreviver se nascesse agora' },
        28: { titulo: '3º trimestre', descricao: 'O bebê abre os olhos e reage a sons' },
        32: { titulo: 'Posição', descricao: 'O bebê geralmente já está de cabeça para baixo' },
        36: { titulo: 'Pulmões maduros', descricao: 'Os pulmões estão quase prontos para respirar' },
        37: { titulo: 'Termo inicial', descricao: 'O bebê é considerado "a termo" - pode nascer com segurança' },
        40: { titulo: 'DPP', descricao: 'Data provável do parto - o bebê pode nascer a qualquer momento' }
    };
    
    // Encontrar a info mais próxima
    const semanasBusca = Object.keys(infos).map(Number).sort((a, b) => a - b);
    let semanaInfo = semanasBusca[0];
    
    for (const s of semanasBusca) {
        if (semanas >= s) {
            semanaInfo = s;
        }
    }
    
    return infos[semanaInfo] || { titulo: '', descricao: '' };
}

// =====================================================
// FORMATAÇÃO DE PORCENTAGEM
// =====================================================

/**
 * Formata porcentagem de progresso
 * @param {number} progresso - 0 a 100
 * @param {number} decimais - Casas decimais (default: 0)
 * @returns {string}
 */
function formatarProgresso(progresso, decimais = 0) {
    return `${progresso.toFixed(decimais)}%`;
}

// =====================================================
// EXPORTAÇÃO DO MÓDULO
// =====================================================

if (typeof window !== 'undefined') {
    window.FormatacaoGestacional = {
        pluralizar,
        formatarSemanasEDias,
        formatarRangeMes,
        formatarMesesCompletos,
        formatarMesesCompacto,
        formatarTrimestre,
        descricaoTrimestre,
        formatarMes,
        gerarExplicacao,
        gerarStatusGestacao,
        infoSemana,
        formatarProgresso
    };
}
