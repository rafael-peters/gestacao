/* =====================================================
   ADMIN.JS - Logica da Area Administrativa
   Editor de exames e gestao de dados
   ===================================================== */

// =====================================================
// CONFIGURACAO
// =====================================================

// Ordem dos periodos
const PERIODOS_ORDEM = ['1-4', '5-8', '9-13', '14-17', '18-22', '23-27', '28-31', '32-35', '36-40'];

// =====================================================
// ESTADO
// =====================================================

const estadoAdmin = {
    logado: false,
    exames: null,
    periodoAtivo: '1-4'
};

// =====================================================
// INICIALIZACAO
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se ja esta logado (token valido na sessao)
    if (verificarTokenValido()) {
        estadoAdmin.logado = true;
        mostrarDashboard();
    }

    // Configurar eventos
    configurarEventos();
});

function configurarEventos() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    // Salvar tudo
    const btnSalvarTudo = document.getElementById('btnSalvarTudo');
    if (btnSalvarTudo) {
        btnSalvarTudo.addEventListener('click', salvarTudo);
    }

    // Resetar tudo
    const btnResetarTudo = document.getElementById('btnResetarTudo');
    if (btnResetarTudo) {
        btnResetarTudo.addEventListener('click', resetarTudo);
    }

    // Exportar JSON
    const btnExportarJSON = document.getElementById('btnExportarJSON');
    if (btnExportarJSON) {
        btnExportarJSON.addEventListener('click', exportarJSON);
    }
}

// =====================================================
// AUTENTICACAO
// =====================================================

async function handleLogin(e) {
    e.preventDefault();

    const senhaInput = document.getElementById('senha');
    const senha = senhaInput.value;
    const erroDiv = document.getElementById('loginErro');
    const btnLogin = e.target.querySelector('button[type="submit"]');

    // Estado de loading
    const textoOriginal = btnLogin.textContent;
    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando...';
    erroDiv.style.display = 'none';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha }),
        });

        const data = await response.json();

        if (data.ok && data.token) {
            estadoAdmin.logado = true;
            sessionStorage.setItem('adminToken', data.token);
            erroDiv.style.display = 'none';
            mostrarDashboard();
        } else {
            erroDiv.textContent = data.erro || 'Senha incorreta. Tente novamente.';
            erroDiv.style.display = 'block';
            senhaInput.value = '';
            senhaInput.focus();
        }
    } catch (err) {
        erroDiv.textContent = 'Erro de conexao. Tente novamente.';
        erroDiv.style.display = 'block';
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = textoOriginal;
    }
}

function handleLogout() {
    estadoAdmin.logado = false;
    sessionStorage.removeItem('adminToken');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('senha').value = '';
}

function verificarTokenValido() {
    const token = sessionStorage.getItem('adminToken');
    if (!token) return false;

    try {
        // Token format: "admin:<expiry_ms>.<signature>"
        const [payload] = token.split('.');
        const expira = parseInt(payload.split(':')[1], 10);
        if (isNaN(expira) || Date.now() > expira) {
            sessionStorage.removeItem('adminToken');
            return false;
        }
        return true;
    } catch {
        sessionStorage.removeItem('adminToken');
        return false;
    }
}

// =====================================================
// DASHBOARD
// =====================================================

async function mostrarDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';

    // Carregar dados
    await carregarExames();

    // Carregar estatisticas
    carregarEstatisticas();

    // Renderizar tabs de periodos
    renderizarPeriodoTabs();

    // Renderizar editor do periodo ativo
    renderizarEditor();

    // Renderizar preview
    renderizarPreview();
}

async function carregarExames() {
    // Primeiro, tentar carregar do localStorage
    try {
        const salvo = localStorage.getItem('examesGestacaoV2');
        if (salvo) {
            estadoAdmin.exames = JSON.parse(salvo);
            return;
        }
    } catch (error) {
        console.warn('Erro ao ler localStorage:', error);
    }

    // Se nao houver, carregar do arquivo JSON
    try {
        const response = await fetch('./assets/data/exames.json');
        const data = await response.json();
        estadoAdmin.exames = data.periodos;
    } catch (error) {
        console.error('Erro ao carregar exames:', error);
        estadoAdmin.exames = getExamesPadrao();
    }
}

async function carregarEstatisticas() {
    const statVisitas = document.getElementById('statVisitas');
    if (!statVisitas) return;

    try {
        // CounterAPI.dev v1 - obter valor atual (sem incrementar)
        const response = await fetch('https://api.counterapi.dev/v1/gestacao-drrafaelpeters/visitas/');
        const data = await response.json();

        if (data && data.count !== undefined) {
            statVisitas.textContent = data.count.toLocaleString('pt-BR');
        } else {
            statVisitas.textContent = '---';
        }
    } catch (error) {
        console.warn('Erro ao carregar estatisticas:', error);
        statVisitas.textContent = '---';
    }
}

// =====================================================
// EDITOR DE PERIODOS
// =====================================================

function renderizarPeriodoTabs() {
    const container = document.getElementById('periodoTabs');
    if (!container || !estadoAdmin.exames) return;

    container.innerHTML = PERIODOS_ORDEM.map(periodo => {
        const dados = estadoAdmin.exames[periodo];
        if (!dados) return '';

        const ativo = periodo === estadoAdmin.periodoAtivo ? 'ativo' : '';
        const triClass = `tri${dados.trimestre}`;

        return `
            <button class="periodo-tab ${triClass} ${ativo}" data-periodo="${periodo}">
                ${dados.emoji || ''} ${dados.titulo}
            </button>
        `;
    }).join('');

    // Adicionar eventos aos tabs
    container.querySelectorAll('.periodo-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            estadoAdmin.periodoAtivo = tab.dataset.periodo;
            renderizarPeriodoTabs();
            renderizarEditor();
            renderizarPreview();
        });
    });
}

function renderizarEditor() {
    const container = document.getElementById('editorContent');
    if (!container || !estadoAdmin.exames) return;

    const periodo = estadoAdmin.periodoAtivo;
    const dados = estadoAdmin.exames[periodo];

    if (!dados) return;

    // Formatar exames para textarea
    const examesTexto = (dados.exames || []).map(e => {
        if (typeof e === 'string') return e;
        return e.destaque ? `*${e.nome}` : e.nome;
    }).join('\n');

    container.innerHTML = `
        <div class="editor-grid">
            <div class="editor-grupo">
                <label for="editorTitulo">Titulo do Periodo:</label>
                <input type="text" id="editorTitulo" value="${dados.titulo || ''}" placeholder="Ex: Semanas 1-4">
            </div>

            <div class="editor-row">
                <div class="editor-grupo">
                    <label for="editorEmoji">Emoji:</label>
                    <input type="text" id="editorEmoji" value="${dados.emoji || ''}" placeholder="Ex: 🌱">
                </div>
                <div class="editor-grupo">
                    <label for="editorTrimestre">Trimestre:</label>
                    <select id="editorTrimestre" class="form-input">
                        <option value="1" ${dados.trimestre === 1 ? 'selected' : ''}>1o</option>
                        <option value="2" ${dados.trimestre === 2 ? 'selected' : ''}>2o</option>
                        <option value="3" ${dados.trimestre === 3 ? 'selected' : ''}>3o</option>
                    </select>
                </div>
            </div>

            <div class="editor-grupo" style="grid-column: 1 / -1;">
                <label for="editorExames">Exames (um por linha):</label>
                <textarea id="editorExames" placeholder="Ultrassom transvaginal&#10;*Exame importante (com asterisco para destaque)">${examesTexto}</textarea>
                <small>Use * no inicio da linha para destacar o exame. Ex: *Morfologico de 1o trimestre</small>
            </div>

            <div class="editor-grupo">
                <label for="editorConsultas">Consultas:</label>
                <textarea id="editorConsultas" style="min-height: 80px;">${dados.consultas || ''}</textarea>
            </div>

            <div class="editor-grupo">
                <label for="editorObs">Observacao:</label>
                <textarea id="editorObs" style="min-height: 80px;">${dados.observacao || ''}</textarea>
            </div>
        </div>
    `;

    // Adicionar eventos de input para preview em tempo real
    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            atualizarDadosPeriodo();
            renderizarPreview();
        });
    });
}

function atualizarDadosPeriodo() {
    const periodo = estadoAdmin.periodoAtivo;
    const dados = estadoAdmin.exames[periodo];

    if (!dados) return;

    // Atualizar dados do periodo atual
    dados.titulo = document.getElementById('editorTitulo')?.value || dados.titulo;
    dados.emoji = document.getElementById('editorEmoji')?.value || dados.emoji;
    dados.trimestre = parseInt(document.getElementById('editorTrimestre')?.value) || dados.trimestre;
    dados.consultas = document.getElementById('editorConsultas')?.value || '';
    dados.observacao = document.getElementById('editorObs')?.value || '';

    // Processar exames
    const examesTexto = document.getElementById('editorExames')?.value || '';
    dados.exames = examesTexto.split('\n')
        .filter(e => e.trim())
        .map(e => {
            const destaque = e.trim().startsWith('*');
            const nome = destaque ? e.trim().substring(1).trim() : e.trim();
            return { nome, destaque };
        });
}

// =====================================================
// PREVIEW
// =====================================================

function renderizarPreview() {
    const container = document.getElementById('previewContent');
    if (!container || !estadoAdmin.exames) return;

    const periodo = estadoAdmin.periodoAtivo;
    const dados = estadoAdmin.exames[periodo];

    if (!dados) return;

    const triClass = `tri${dados.trimestre}`;
    const examesHTML = (dados.exames || []).map(e => {
        const nome = typeof e === 'string' ? e : e.nome;
        const destaque = typeof e === 'string' ? e.startsWith('*') : e.destaque;
        const nomeClean = destaque && typeof e === 'string' ? e.substring(1) : nome;
        return destaque
            ? `<li><span class="destaque">${nomeClean}</span></li>`
            : `<li>${nomeClean}</li>`;
    }).join('');

    container.innerHTML = `
        <div class="preview-box ${triClass}">
            <h4>${dados.emoji || ''} ${dados.titulo || 'Sem titulo'}</h4>

            <ul>${examesHTML || '<li>Nenhum exame cadastrado</li>'}</ul>

            <div class="preview-consultas">
                <strong>Consultas:</strong> ${dados.consultas || 'Nao informado'}
            </div>

            ${dados.observacao ? `<div class="preview-obs">${dados.observacao}</div>` : ''}
        </div>
    `;
}

// =====================================================
// ACOES
// =====================================================

function salvarTudo() {
    // Garantir que os dados atuais estao atualizados
    atualizarDadosPeriodo();

    // Salvar no localStorage
    localStorage.setItem('examesGestacaoV2', JSON.stringify(estadoAdmin.exames));

    mostrarToast('Alteracoes salvas com sucesso!', 'success');
}

function resetarTudo() {
    if (confirm('Tem certeza que deseja restaurar TODOS os periodos para o padrao?\n\nIsso apagara todas as suas personalizacoes.')) {
        localStorage.removeItem('examesGestacaoV2');
        mostrarToast('Dados restaurados. Recarregando...', 'info');
        setTimeout(() => location.reload(), 1000);
    }
}

function exportarJSON() {
    // Garantir dados atualizados
    atualizarDadosPeriodo();

    // Criar objeto JSON completo
    const jsonData = {
        versao: '1.0',
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
        autor: 'Dr. Rafael Peters',
        periodos: estadoAdmin.exames
    };

    // Converter para string formatada
    const jsonString = JSON.stringify(jsonData, null, 2);

    // Criar blob e link para download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'exames.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    mostrarToast('JSON exportado com sucesso!', 'success');
}

// =====================================================
// DADOS PADRAO
// =====================================================

function getExamesPadrao() {
    return {
        '1-4': {
            titulo: 'Semanas 1-4',
            emoji: '🌱',
            trimestre: 1,
            exames: [
                { nome: 'Teste de gravidez (beta-hCG)', destaque: true },
                { nome: 'Inicio do acido folico 5mg/dia', destaque: true }
            ],
            consultas: 'Primeira consulta ao confirmar gravidez',
            observacao: 'Periodo de implantacao. Evite medicamentos sem orientacao medica.'
        },
        '5-8': {
            titulo: 'Semanas 5-8',
            emoji: '💗',
            trimestre: 1,
            exames: [
                { nome: 'Ultrassom transvaginal', destaque: true },
                { nome: 'Tipagem sanguinea e Rh', destaque: false },
                { nome: 'Hemograma completo', destaque: false },
                { nome: 'Glicemia de jejum', destaque: false },
                { nome: 'Sorologias (HIV, Sifilis, Hepatites B e C, Toxoplasmose, Rubeola)', destaque: false },
                { nome: 'Urina tipo 1 e urocultura', destaque: false },
                { nome: 'TSH', destaque: false }
            ],
            consultas: 'Consulta pre-natal mensal',
            observacao: 'Batimentos cardiacos visiveis a partir de 6 semanas.'
        },
        '9-13': {
            titulo: 'Semanas 9-13',
            emoji: '✨',
            trimestre: 1,
            exames: [
                { nome: 'Morfologico de 1o trimestre (11-14 sem)', destaque: true },
                { nome: 'Translucencia Nucal (TN)', destaque: true },
                { nome: 'Rastreamento bioquimico (PAPP-A, beta-hCG livre)', destaque: false },
                { nome: 'NIPT - Teste pre-natal nao invasivo (opcional)', destaque: false }
            ],
            consultas: 'Consulta pre-natal mensal',
            observacao: 'Melhor periodo para rastreamento de cromossomopatias.'
        },
        '14-17': {
            titulo: 'Semanas 14-17',
            emoji: '🎵',
            trimestre: 2,
            exames: [
                { nome: 'Ultrassom obstetrico', destaque: false },
                { nome: 'Repetir sorologias negativas (Toxo, Rubeola)', destaque: false }
            ],
            consultas: 'Consulta pre-natal mensal',
            observacao: 'Periodo de maior bem-estar. Inicio da percepcao dos movimentos fetais.'
        },
        '18-22': {
            titulo: 'Semanas 18-22',
            emoji: '❤️',
            trimestre: 2,
            exames: [
                { nome: 'Morfologico de 2o trimestre (20-24 sem)', destaque: true },
                { nome: 'Avaliacao anatomica completa do feto', destaque: true },
                { nome: 'Ecocardiografia fetal (se indicada)', destaque: false },
                { nome: 'Avaliacao do colo uterino', destaque: false }
            ],
            consultas: 'Consulta pre-natal mensal',
            observacao: 'Periodo ideal para visualizar o sexo do bebe e avaliar toda a anatomia fetal.'
        },
        '23-27': {
            titulo: 'Semanas 23-27',
            emoji: '🧠',
            trimestre: 2,
            exames: [
                { nome: 'TOTG 75g - Teste de tolerancia a glicose (24-28 sem)', destaque: true },
                { nome: 'Hemograma de controle', destaque: false },
                { nome: 'Repetir sorologias negativas', destaque: false },
                { nome: 'Coombs indireto (se Rh negativo)', destaque: false }
            ],
            consultas: 'Consulta pre-natal quinzenal ou mensal',
            observacao: 'Rastreamento de diabetes gestacional. Atencao ao ganho de peso.'
        },
        '28-31': {
            titulo: 'Semanas 28-31',
            emoji: '👁️',
            trimestre: 3,
            exames: [
                { nome: 'Ultrassom de 3o trimestre', destaque: true },
                { nome: 'Vacina dTpa (a partir de 20 semanas)', destaque: true },
                { nome: 'Imunoglobulina anti-D (se Rh negativo)', destaque: false }
            ],
            consultas: 'Consulta pre-natal quinzenal',
            observacao: 'Atencao para sinais de parto prematuro.'
        },
        '32-35': {
            titulo: 'Semanas 32-35',
            emoji: '🫁',
            trimestre: 3,
            exames: [
                { nome: 'Ultrassom com Doppler', destaque: true },
                { nome: 'Cardiotocografia (se indicada)', destaque: false },
                { nome: 'Cultura para Streptococcus B (GBS) - 35-37 sem', destaque: true },
                { nome: 'Repetir sorologias (HIV, Sifilis, Hepatites)', destaque: false },
                { nome: 'Hemograma e coagulograma pre-parto', destaque: false }
            ],
            consultas: 'Consulta pre-natal quinzenal',
            observacao: 'Avaliacao da posicao fetal, liquido amniotico e bem-estar fetal.'
        },
        '36-40': {
            titulo: 'Semanas 36-40',
            emoji: '👶',
            trimestre: 3,
            exames: [
                { nome: 'Ultrassom (peso estimado e posicao fetal)', destaque: true },
                { nome: 'Cardiotocografia semanal', destaque: false },
                { nome: 'Avaliacao do colo uterino (Bishop)', destaque: false },
                { nome: 'Monitoramento fetal', destaque: false }
            ],
            consultas: 'Consulta pre-natal semanal',
            observacao: 'Reta final! Fique atenta: contracoes regulares, perda do tampao mucoso, ruptura da bolsa.'
        }
    };
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

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
        <button class="toast-close" aria-label="Fechar notificacao">&times;</button>
    `;

    container.appendChild(toast);

    const btnClose = toast.querySelector('.toast-close');
    btnClose.addEventListener('click', () => fecharToast(toast));

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
