/* =====================================================
   IG-CALCULATOR.JS - Lógica Principal da Calculadora
   Coordena interface, eventos e renderização
   ===================================================== */

// =====================================================
// ESTADO DA APLICAÇÃO
// =====================================================

const estado = {
    // Valores atuais
    semanas: 20,
    dias: 0,
    
    // Método de cálculo selecionado ('dum', 'dpp', 'ultrassom', 'slider')
    metodo: 'slider',
    
    // Dados calculados
    resultado: null,
    
    // Dados de exames (carregado do JSON)
    exames: null,
    
    // Editor aberto?
    editorAberto: false
};

// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener('DOMContentLoaded', async function() {
    // Carregar dados de exames
    await carregarExames();

    // Configurar event listeners
    configurarEventos();

    // Calcular e renderizar estado inicial
    calcularEAtualizar();

    // Incrementar e exibir contador de visitas
    atualizarContadorVisitas();
});

// =====================================================
// CONTADOR DE VISITAS
// =====================================================

/**
 * Busca e incrementa o contador de visitas usando CounterAPI.dev
 */
async function atualizarContadorVisitas() {
    const contadorElement = document.getElementById('contadorVisitas');
    if (!contadorElement) return;

    try {
        // CounterAPI.dev v1 - namespace: gestacao-drrafaelpeters, name: visitas
        // Endpoint /up incrementa e retorna o valor atual
        const response = await fetch('https://api.counterapi.dev/v1/gestacao-drrafaelpeters/visitas/up');
        const data = await response.json();

        if (data && data.count !== undefined) {
            contadorElement.textContent = data.count.toLocaleString('pt-BR');
        } else {
            contadorElement.textContent = '---';
        }
    } catch (error) {
        console.warn('Erro ao carregar contador de visitas:', error);
        contadorElement.textContent = '---';
    }
}

/**
 * Carrega dados de exames do JSON ou localStorage
 */
async function carregarExames() {
    // Primeiro, tentar carregar do localStorage (personalizações do usuário)
    try {
        const salvo = localStorage.getItem('examesGestacaoV2');
        if (salvo) {
            estado.exames = JSON.parse(salvo);
            return;
        }
    } catch (error) {
        console.warn('Erro ao ler localStorage, usando dados padrão:', error);
        localStorage.removeItem('examesGestacaoV2');
    }

    // Se não houver, carregar do arquivo JSON
    try {
        const response = await fetch('./assets/data/exames.json');
        const data = await response.json();
        estado.exames = data.periodos;
    } catch (error) {
        console.error('Erro ao carregar exames:', error);
        // Usar dados padrão inline se falhar
        estado.exames = getExamesPadrao();
    }
}

/**
 * Retorna dados padrão de exames (fallback para quando JSON não carrega)
 */
function getExamesPadrao() {
    return {
        '1-4': {
            titulo: 'Semanas 1-4',
            emoji: '🌱',
            trimestre: 1,
            exames: [
                { nome: 'Teste de gravidez (beta-hCG)', destaque: true },
                { nome: 'Início do ácido fólico 5mg/dia', destaque: true }
            ],
            consultas: 'Primeira consulta ao confirmar gravidez',
            observacao: 'Período de implantação. Evite medicamentos sem orientação médica.'
        },
        '5-8': {
            titulo: 'Semanas 5-8',
            emoji: '💗',
            trimestre: 1,
            exames: [
                { nome: 'Ultrassom transvaginal', destaque: true },
                { nome: 'Tipagem sanguínea e Rh' },
                { nome: 'Hemograma completo' },
                { nome: 'Glicemia de jejum' },
                { nome: 'Sorologias (HIV, Sífilis, Hepatites B e C, Toxoplasmose, Rubéola)' },
                { nome: 'Urina tipo 1 e urocultura' },
                { nome: 'TSH' }
            ],
            consultas: 'Consulta pré-natal mensal',
            observacao: 'Batimentos cardíacos visíveis a partir de 6 semanas.'
        },
        '9-13': {
            titulo: 'Semanas 9-13',
            emoji: '✨',
            trimestre: 1,
            exames: [
                { nome: 'Morfológico de 1º trimestre (11-14 sem)', destaque: true },
                { nome: 'Translucência Nucal (TN)', destaque: true },
                { nome: 'Rastreamento bioquímico (PAPP-A, beta-hCG livre)' },
                { nome: 'NIPT - Teste pré-natal não invasivo (opcional)' }
            ],
            consultas: 'Consulta pré-natal mensal',
            observacao: 'Melhor período para rastreamento de cromossomopatias.'
        },
        '14-17': {
            titulo: 'Semanas 14-17',
            emoji: '🎵',
            trimestre: 2,
            exames: [
                { nome: 'Ultrassom obstétrico' },
                { nome: 'Repetir sorologias negativas (Toxo, Rubéola)' }
            ],
            consultas: 'Consulta pré-natal mensal',
            observacao: 'Período de maior bem-estar. Início da percepção dos movimentos fetais.'
        },
        '18-22': {
            titulo: 'Semanas 18-22',
            emoji: '❤️',
            trimestre: 2,
            exames: [
                { nome: 'Morfológico de 2º trimestre (20-24 sem)', destaque: true },
                { nome: 'Avaliação anatômica completa do feto', destaque: true },
                { nome: 'Ecocardiografia fetal (se indicada)' },
                { nome: 'Avaliação do colo uterino' }
            ],
            consultas: 'Consulta pré-natal mensal',
            observacao: 'Período ideal para visualizar o sexo do bebê e avaliar toda a anatomia fetal.'
        },
        '23-27': {
            titulo: 'Semanas 23-27',
            emoji: '🧠',
            trimestre: 2,
            exames: [
                { nome: 'TOTG 75g - Teste de tolerância à glicose (24-28 sem)', destaque: true },
                { nome: 'Hemograma de controle' },
                { nome: 'Repetir sorologias negativas' },
                { nome: 'Coombs indireto (se Rh negativo)' }
            ],
            consultas: 'Consulta pré-natal quinzenal ou mensal',
            observacao: 'Rastreamento de diabetes gestacional. Atenção ao ganho de peso.'
        },
        '28-31': {
            titulo: 'Semanas 28-31',
            emoji: '👁️',
            trimestre: 3,
            exames: [
                { nome: 'Ultrassom de 3º trimestre', destaque: true },
                { nome: 'Vacina dTpa (a partir de 20 semanas)', destaque: true },
                { nome: 'Imunoglobulina anti-D (se Rh negativo)' }
            ],
            consultas: 'Consulta pré-natal quinzenal',
            observacao: 'Atenção para sinais de parto prematuro.'
        },
        '32-35': {
            titulo: 'Semanas 32-35',
            emoji: '🫁',
            trimestre: 3,
            exames: [
                { nome: 'Ultrassom com Doppler', destaque: true },
                { nome: 'Cardiotocografia (se indicada)' },
                { nome: 'Cultura para Streptococcus B (GBS) - 35-37 sem', destaque: true },
                { nome: 'Repetir sorologias (HIV, Sífilis, Hepatites)' },
                { nome: 'Hemograma e coagulograma pré-parto' }
            ],
            consultas: 'Consulta pré-natal quinzenal',
            observacao: 'Avaliação da posição fetal, líquido amniótico e bem-estar fetal.'
        },
        '36-40': {
            titulo: 'Semanas 36-40',
            emoji: '👶',
            trimestre: 3,
            exames: [
                { nome: 'Ultrassom (peso estimado e posição fetal)', destaque: true },
                { nome: 'Cardiotocografia semanal' },
                { nome: 'Avaliação do colo uterino (Bishop)' },
                { nome: 'Monitoramento fetal' }
            ],
            consultas: 'Consulta pré-natal semanal',
            observacao: 'Reta final! Fique atenta: contrações regulares, perda do tampão mucoso, ruptura da bolsa.'
        }
    };
}

// =====================================================
// CONFIGURAÇÃO DE EVENTOS
// =====================================================

function configurarEventos() {
    // === SLIDER DE SEMANAS ===
    const sliderSemanas = document.getElementById('sliderSemanas');
    if (sliderSemanas) {
        sliderSemanas.addEventListener('input', (e) => {
            estado.semanas = parseInt(e.target.value);
            estado.dias = 0; // Resetar dias ao mover slider
            estado.metodo = 'slider';
            resetarMetodosCalculo(); // Resetar cards DUM/DPP/US
            calcularEAtualizar();
        });
    }
    
    // === INPUT DE SEMANAS (numérico) ===
    const inputSemanas = document.getElementById('inputSemanas');
    if (inputSemanas) {
        inputSemanas.addEventListener('change', (e) => {
            let valor = parseInt(e.target.value) || 0;
            valor = Math.max(1, Math.min(42, valor));
            estado.semanas = valor;
            estado.metodo = 'slider';
            calcularEAtualizar();
        });
    }
    
    // === INPUT DE DIAS (0-6) ===
    const inputDias = document.getElementById('inputDias');
    if (inputDias) {
        inputDias.addEventListener('change', (e) => {
            let valor = parseInt(e.target.value) || 0;
            valor = Math.max(0, Math.min(6, valor));
            estado.dias = valor;
            estado.metodo = 'slider';
            calcularEAtualizar();
        });
    }
    
    // === SELEÇÃO DE MÉTODO ===
    const metodoRadios = document.querySelectorAll('input[name="metodo"]');
    metodoRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            estado.metodo = e.target.value;
            atualizarVisibilidadeCampos();
        });
    });
    
    // === BOTÃO CALCULAR ===
    const btnCalcular = document.getElementById('btnCalcular');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', calcularPorMetodo);
    }
    
    // === BOTÃO EDITOR ===
    const btnEditor = document.getElementById('btnEditor');
    if (btnEditor) {
        btnEditor.addEventListener('click', toggleEditor);
    }
    
    // === BOTÃO SALVAR EXAMES ===
    const btnSalvarExames = document.getElementById('btnSalvarExames');
    if (btnSalvarExames) {
        btnSalvarExames.addEventListener('click', salvarExames);
    }
    
    // === BOTÃO RESETAR EXAMES ===
    const btnResetarExames = document.getElementById('btnResetarExames');
    if (btnResetarExames) {
        btnResetarExames.addEventListener('click', resetarExames);
    }
}

// =====================================================
// CÁLCULO PRINCIPAL
// =====================================================

/**
 * Calcula idade gestacional baseado no método selecionado
 */
function calcularPorMetodo() {
    const Calc = window.CalculosGestacionais;
    limparValidacaoCampos();

    switch (estado.metodo) {
        case 'dum': {
            const inputDUM = document.getElementById('inputDUM');
            const dum = inputDUM?.value;
            if (!dum) {
                marcarCampoErro(inputDUM);
                mostrarErro('Por favor, informe a data da última menstruação.');
                return;
            }

            const validacao = Calc.validarDUM(dum);
            if (!validacao.valido) {
                marcarCampoErro(inputDUM);
                mostrarErro(validacao.mensagem);
                return;
            }

            marcarCampoValido(inputDUM);
            const dpp = Calc.calcularDPP('dum', { dum });
            const diasGestacao = Calc.calcularDiasGestacao(dpp);
            const { semanas, dias } = Calc.diasParaSemanasEDias(diasGestacao);

            estado.semanas = semanas;
            estado.dias = dias;
            break;
        }

        case 'dpp': {
            const inputDPP = document.getElementById('inputDPP');
            const dpp = inputDPP?.value;
            if (!dpp) {
                marcarCampoErro(inputDPP);
                mostrarErro('Por favor, informe a data provável do parto.');
                return;
            }

            const validacao = Calc.validarDPP(dpp);
            if (!validacao.valido) {
                marcarCampoErro(inputDPP);
                mostrarErro(validacao.mensagem);
                return;
            }

            marcarCampoValido(inputDPP);
            const diasGestacao = Calc.calcularDiasGestacao(Calc.parseData(dpp));
            const { semanas, dias } = Calc.diasParaSemanasEDias(diasGestacao);

            estado.semanas = semanas;
            estado.dias = dias;
            break;
        }

        case 'ultrassom': {
            const inputDataExame = document.getElementById('inputDataExame');
            const inputSemExame = document.getElementById('inputSemExame');
            const inputDiasExame = document.getElementById('inputDiasExame');

            const dataExame = inputDataExame?.value;
            const semExame = parseInt(inputSemExame?.value) || 0;
            const diasExame = parseInt(inputDiasExame?.value) || 0;

            if (!dataExame) {
                marcarCampoErro(inputDataExame);
                mostrarErro('Por favor, informe a data do exame.');
                return;
            }

            const validacao = Calc.validarIG(semExame, diasExame);
            if (!validacao.valido) {
                marcarCampoErro(inputSemExame);
                marcarCampoErro(inputDiasExame);
                mostrarErro(validacao.mensagem);
                return;
            }

            marcarCampoValido(inputDataExame);
            marcarCampoValido(inputSemExame);
            marcarCampoValido(inputDiasExame);

            const dpp = Calc.calcularDPP('ultrassom', {
                dataExame,
                semanas: semExame,
                dias: diasExame
            });

            const diasGestacao = Calc.calcularDiasGestacao(dpp);
            const { semanas, dias } = Calc.diasParaSemanasEDias(diasGestacao);

            estado.semanas = Math.max(1, semanas);
            estado.dias = dias;
            break;
        }
    }

    calcularEAtualizar();
    limparErro();
}

/**
 * Marca um campo como erro
 */
function marcarCampoErro(input) {
    if (input) {
        input.classList.remove('valid');
        input.classList.add('error');
    }
}

/**
 * Marca um campo como válido
 */
function marcarCampoValido(input) {
    if (input) {
        input.classList.remove('error');
        input.classList.add('valid');
    }
}

/**
 * Limpa validação visual de todos os campos
 */
function limparValidacaoCampos() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.classList.remove('error', 'valid');
    });
}

/**
 * Calcula o resultado e atualiza toda a interface
 */
function calcularEAtualizar() {
    const Calc = window.CalculosGestacionais;
    
    // Calcular total de dias
    const totalDias = Calc.semanasEDiasParaDias(estado.semanas, estado.dias);
    
    // Converter para resultado completo
    estado.resultado = Calc.converterIdadeGestacional(totalDias);
    
    // Atualizar toda a interface
    renderizarResultado();
    renderizarTimeline();
    renderizarExames();
    atualizarSlider();
    atualizarInputs();
}

// =====================================================
// RENDERIZAÇÃO
// =====================================================

/**
 * Renderiza a caixa de resultado principal
 */
function renderizarResultado() {
    const r = estado.resultado;
    const Fmt = window.FormatacaoGestacional;
    
    // Classe do trimestre
    const resultadoBox = document.getElementById('resultadoBox');
    if (resultadoBox) {
        resultadoBox.className = `resultado-box tri${r.trimestre}`;
    }
    
    // Semanas grandes
    const semanaDisplay = document.getElementById('semanaDisplay');
    if (semanaDisplay) {
        semanaDisplay.textContent = Fmt.formatarSemanasEDias(r.semanas, r.dias, false);
    }

    // Dias = Meses comerciais completos
    const comercialDisplay = document.getElementById('comercialDisplay');
    if (comercialDisplay) {
        // Caso especial: 40 semanas exatas = 9 meses (para ficar bonito)
        if (r.totalDias === 280) {
            comercialDisplay.textContent = '280 dias = 9 meses';
        } else {
            const mesesTexto = Fmt.formatarMesesCompletos(
                r.mesesCompletos,
                r.semanasExtras,
                r.diasExtras
            );
            comercialDisplay.textContent = `${r.totalDias} dias = ${mesesTexto}`;
        }
    }
    
    // Badge do trimestre
    const trimestreBadge = document.getElementById('trimestreBadge');
    if (trimestreBadge) {
        trimestreBadge.textContent = Fmt.formatarTrimestre(r.trimestre);
        trimestreBadge.className = `badge tri${r.trimestre}`;
    }
    
    // Mês badge
    const mesBadge = document.getElementById('mesBadge');
    if (mesBadge) {
        mesBadge.textContent = Fmt.formatarMes(r.mesAtual);
    }

    // Range do mês (sem a palavra "Semanas")
    const rangeDisplay = document.getElementById('rangeDisplay');
    if (rangeDisplay && r.dadosMes) {
        rangeDisplay.textContent = Fmt.formatarRangeMes(r.dadosMes);
    }
    
    // Explicação - Data Provável do Parto
    const explicacao = document.getElementById('explicacao');
    if (explicacao) {
        const Calc = window.CalculosGestacionais;
        const diasRestantes = 280 - r.totalDias;
        const dppEstimada = Calc.adicionarDias(new Date(), diasRestantes);
        const dataFormatada = Calc.formatarData(dppEstimada);
        explicacao.innerHTML = `Data provável do parto estimada: <strong>${dataFormatada}</strong>`;
    }

    // Barra de progresso
    const progressoFill = document.getElementById('progressoFill');
    if (progressoFill) {
        progressoFill.style.width = `${r.progresso}%`;
    }
    
    const progressoTexto = document.getElementById('progressoTexto');
    if (progressoTexto) {
        progressoTexto.textContent = Fmt.formatarProgresso(r.progresso, 1);
    }
}

/**
 * Renderiza a linha do tempo (trimestres e meses)
 */
function renderizarTimeline() {
    const r = estado.resultado;
    const Fmt = window.FormatacaoGestacional;
    
    // Trimestres
    const trimestres = document.querySelectorAll('.trimestre-box');
    trimestres.forEach((box, index) => {
        const triNum = index + 1;
        box.classList.toggle('ativo', r.trimestre === triNum);
    });
    
    // Grid de meses
    const mesesGrid = document.getElementById('mesesGrid');
    if (mesesGrid) {
        mesesGrid.innerHTML = r.tabelaMeses.map(item => {
            const inicio = Fmt.formatarSemanasEDias(item.semInicio, item.diaInicio, true);
            const fim = Fmt.formatarSemanasEDias(item.semFim, item.diaFim, true);
            return `
            <div class="mes-box tri${item.tri} ${r.mesAtual === item.mes ? 'ativo' : ''}">
                <div class="numero">${item.mes}º</div>
                <div class="label">mês</div>
                <div class="semanas-range">
                    <span class="sem-inicio">${inicio}</span>
                    <span class="sem-separador">a</span>
                    <span class="sem-fim">${fim}</span>
                </div>
            </div>
        `}).join('');
    }
}

/**
 * Renderiza a seção de exames
 */
function renderizarExames() {
    const Calc = window.CalculosGestacionais;
    const Fmt = window.FormatacaoGestacional;

    if (!Calc || !Fmt || !estado.exames) return;

    const periodo = Calc.obterPeriodoExame(estado.semanas);
    const dados = estado.exames[periodo];

    if (!dados) return;

    const examesGrid = document.getElementById('examesGrid');
    if (!examesGrid) return;

    // Info da semana atual
    const infoSemana = Fmt.infoSemana(estado.semanas);

    // Formatar lista de exames
    const formatarExame = (e) => {
        if (typeof e === 'string') {
            const destaque = e.startsWith('*');
            const nome = destaque ? e.substring(1) : e;
            return destaque
                ? `<span class="destaque">${nome}</span>`
                : nome;
        }
        return e.destaque
            ? `<span class="destaque">${e.nome}</span>`
            : e.nome;
    };

    const listaExames = Array.isArray(dados.exames)
        ? dados.exames
        : [];

    examesGrid.innerHTML = `
        <div class="exame-display tri${dados.trimestre}">
            <h4>${dados.emoji || '🩺'} ${dados.titulo}</h4>

            ${infoSemana.titulo ? `
            <div class="info-semana-box" style="background: var(--fundo-secundario); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-weight: 600; color: var(--texto);">💡 ${infoSemana.titulo}</div>
                <div style="font-size: 0.9rem; color: var(--texto-secundario); margin-top: 4px;">${infoSemana.descricao}</div>
            </div>
            ` : ''}

            <div class="exame-categoria">
                <div class="exame-categoria-titulo">📋 Exames Recomendados</div>
                <ul class="exame-lista">
                    ${listaExames.map(e => `<li>${formatarExame(e)}</li>`).join('')}
                </ul>
            </div>

            <div class="exame-categoria">
                <div class="exame-categoria-titulo">📅 Consultas</div>
                <p style="font-size: 0.9rem; color: var(--texto);">${dados.consultas || 'Consulta pré-natal conforme orientação médica'}</p>
            </div>

            ${dados.observacao ? `<div class="exame-nota">${dados.observacao}</div>` : ''}
        </div>

        <div class="exame-display tri${dados.trimestre}">
            <h4>📌 Informação Importante</h4>
            <p style="font-size: 0.9rem; color: var(--texto-secundario); line-height: 1.7;">
                Os exames listados são <strong style="color: var(--texto);">recomendações gerais</strong>
                baseadas nas diretrizes obstétricas brasileiras.
            </p>
            <p style="font-size: 0.9rem; color: var(--texto-secundario); line-height: 1.7; margin-top: 12px;">
                Seu médico pode solicitar exames adicionais ou em momentos diferentes,
                de acordo com suas <strong style="color: var(--texto);">necessidades específicas</strong>.
            </p>
            <div class="exame-nota" style="margin-top: 16px;">
                Siga sempre as orientações do seu médico para o acompanhamento da sua gestação.
            </div>
        </div>
    `;

    // Atualizar editor se estiver aberto
    atualizarEditor(periodo, dados);
}

/**
 * Atualiza o slider e inputs para refletir o estado atual
 */
function atualizarSlider() {
    const slider = document.getElementById('sliderSemanas');
    if (slider && parseInt(slider.value) !== estado.semanas) {
        slider.value = estado.semanas;
    }
}

function atualizarInputs() {
    const inputSemanas = document.getElementById('inputSemanas');
    if (inputSemanas) {
        inputSemanas.value = estado.semanas;
    }
    
    const inputDias = document.getElementById('inputDias');
    if (inputDias) {
        inputDias.value = estado.dias;
    }
}

// =====================================================
// EDITOR DE EXAMES
// =====================================================

function toggleEditor() {
    estado.editorAberto = !estado.editorAberto;
    const painel = document.getElementById('editorPanel');
    const btnEditor = document.getElementById('btnEditor');

    if (painel) {
        painel.classList.toggle('ativo', estado.editorAberto);
    }

    if (btnEditor) {
        btnEditor.setAttribute('aria-expanded', estado.editorAberto);
    }
}

function atualizarEditor(periodo, dados) {
    const editorPeriodo = document.getElementById('editorPeriodo');
    if (editorPeriodo) {
        editorPeriodo.textContent = dados.titulo;
    }
    
    const editorExames = document.getElementById('editorExames');
    if (editorExames) {
        const lista = (dados.exames || []).map(e => {
            if (typeof e === 'string') return e;
            return e.destaque ? `*${e.nome}` : e.nome;
        });
        editorExames.value = lista.join('\n');
    }
    
    const editorConsultas = document.getElementById('editorConsultas');
    if (editorConsultas) {
        editorConsultas.value = dados.consultas || '';
    }
    
    const editorNotas = document.getElementById('editorNotas');
    if (editorNotas) {
        editorNotas.value = dados.observacao || '';
    }
}

function salvarExames() {
    const Calc = window.CalculosGestacionais;
    const periodo = Calc.obterPeriodoExame(estado.semanas);
    
    const examesTexto = document.getElementById('editorExames')?.value || '';
    const exames = examesTexto.split('\n')
        .filter(e => e.trim())
        .map(e => {
            const destaque = e.trim().startsWith('*');
            const nome = destaque ? e.trim().substring(1) : e.trim();
            return { nome, destaque };
        });
    
    estado.exames[periodo].exames = exames;
    estado.exames[periodo].consultas = document.getElementById('editorConsultas')?.value || '';
    estado.exames[periodo].observacao = document.getElementById('editorNotas')?.value || '';
    
    // Salvar no localStorage
    localStorage.setItem('examesGestacaoV2', JSON.stringify(estado.exames));
    
    // Re-renderizar
    renderizarExames();
    
    // Feedback
    mostrarSucesso('✅ Exames salvos com sucesso!');
}

function resetarExames() {
    if (confirm('Restaurar todos os exames para o padrão? Isso apagará suas personalizações.')) {
        localStorage.removeItem('examesGestacaoV2');
        location.reload();
    }
}

// =====================================================
// UTILIDADES DE UI
// =====================================================

function atualizarVisibilidadeCampos() {
    const metodos = ['dum', 'dpp', 'ultrassom'];

    metodos.forEach(m => {
        const campos = document.getElementById(`campos-${m}`);
        if (campos) {
            campos.style.display = estado.metodo === m ? 'block' : 'none';
        }
    });
}

/**
 * Reseta os cards de método (DUM/DPP/US) ao usar o slider
 */
function resetarMetodosCalculo() {
    // Desmarcar todos os radio buttons
    const radios = document.querySelectorAll('input[name="metodo"]');
    radios.forEach(radio => {
        radio.checked = false;
    });

    // Esconder todos os campos
    const metodos = ['dum', 'dpp', 'ultrassom'];
    metodos.forEach(m => {
        const campos = document.getElementById(`campos-${m}`);
        if (campos) {
            campos.style.display = 'none';
        }
    });

    // Limpar validação visual
    limparValidacaoCampos();
    limparErro();
}

function mostrarErro(mensagem) {
    const erroBox = document.getElementById('erroBox');
    if (erroBox) {
        erroBox.textContent = mensagem;
        erroBox.style.display = 'block';
    }
    mostrarToast(mensagem, 'error');
}

function limparErro() {
    const erroBox = document.getElementById('erroBox');
    if (erroBox) {
        erroBox.style.display = 'none';
    }
}

function mostrarSucesso(mensagem) {
    mostrarToast(mensagem, 'success');
}

/**
 * Sistema de Toast Notifications
 * @param {string} mensagem - Mensagem a exibir
 * @param {string} tipo - 'success', 'error', 'warning', 'info'
 * @param {number} duracao - Duração em ms (default: 4000)
 */
function mostrarToast(mensagem, tipo = 'info', duracao = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icones = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${icones[tipo]}</span>
        <span class="toast-message">${mensagem}</span>
        <button class="toast-close" aria-label="Fechar notificação">&times;</button>
    `;

    container.appendChild(toast);

    // Fechar ao clicar no X
    const btnClose = toast.querySelector('.toast-close');
    btnClose.addEventListener('click', () => fecharToast(toast));

    // Auto-fechar após duração
    setTimeout(() => fecharToast(toast), duracao);
}

function fecharToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;

    toast.classList.add('hiding');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 200);
}

// =====================================================
// EXPORTAÇÃO GLOBAL
// =====================================================

window.IGCalculator = {
    estado,
    calcularEAtualizar,
    calcularPorMetodo
};
