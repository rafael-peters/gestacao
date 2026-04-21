/**
 * ig-basica.js — versão reduzida para secretaria/consultório.
 * Sem lock, sem biometria. Seleciona método via radio → banner + timeline se atualizam.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'ig-basica-v1';
  const PROTO_KEY = 'ig-basica-protocolo-v1';

  // ============ MÉTODOS ============
  // Configuração declarativa dos 6 métodos disponíveis
  const METODOS = [
    { id: 'dum', label: 'DUM', tipo: 'date', campo: 'dum' },
    { id: 'ovulacao', label: 'Ovulação', tipo: 'date', campo: 'ovulacao' },
    { id: 'fiv5', label: 'FIV 5 dias', tipo: 'date', campo: 'fiv5' },
    { id: 'dpp', label: 'DPP', tipo: 'date', campo: 'dpp' },
    { id: 'manual', label: 'IG manual', tipo: 'sem_dias' },
    { id: 'us', label: 'US anterior', tipo: 'us' },
  ];

  // ============ STATE ============
  const defaultState = () => ({
    paciente: '',
    dum: '',
    ovulacao: '',
    fiv5: '',
    dpp: '',
    manual_sem: '',
    manual_dias: '',
    us: { data: '', sem: '', dias: '' },
    selected: null,
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
    } catch (e) { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function clearState() {
    if (!confirm('Limpar todos os dados?')) return;
    state = defaultState();
    saveState();
    hydrate();
    const nomeInput = $('pacienteNome');
    if (nomeInput) nomeInput.value = '';
    render();
  }

  // ============ PROTOCOLO ============
  // Cor por evento (default) — user pode mudar no editor. "#ffffff" = sem fundo no calendário.
  const CORES_DEFAULT = {
    dum:              '#ffffff',
    ovulacao:         '#ffffff',
    us_viabilidade:   '#06b6d4',
    us_inicial:       '#3b82f6',
    morfo_1t:         '#10b981',
    morfo_1t_limite:  '#f59e0b',
    sexo:             '#ec4899',
    morfo_2t:         '#a855f7',
    ecocardio:        '#ef4444',
    doppler_3d:       '#f97316',
    morfo_3t:         '#14b8a6',
    maturidade:       '#eab308',
    dpp:              '#f43f5e',
    pos_termo:        '#ffffff',
  };
  const ICONES_DEFAULT = {
    ovulacao:   '🎯',
    dpp:        '🏁',
  };
  // Marcador pequeno DENTRO da célula (número permanece visível)
  const MARKERS_DEFAULT = {
    dum:       'arrow-right',  // triângulo cheio apontando →
    ovulacao:  'circle',       // círculo outline (aro)
    dpp:       'square',       // quadrado outline
    pos_termo: 'arrow-left',   // triângulo cheio ←
  };
  // Categoria do evento na legenda (marcador ou ecografia)
  const GRUPOS_DEFAULT = {
    dum: 'marcador',
    ovulacao: 'marcador',
    sexo: 'marcador',
    maturidade: 'marcador',
    dpp: 'marcador',
    pos_termo: 'marcador',
    us_viabilidade: 'ecografia',
    us_inicial: 'ecografia',
    morfo_1t: 'ecografia',
    morfo_1t_limite: 'ecografia',
    morfo_2t: 'ecografia',
    morfo_3t: 'ecografia',
    ecocardio: 'ecografia',
    doppler_3d: 'ecografia',
  };
  const CORES_MARKER_DEFAULT = {
    dum:       '#3b82f6',
    ovulacao:  '#ec4899',
    dpp:       '#f43f5e',
    pos_termo: '#ef4444',
  };
  const MARKER_OPTS = [
    { v: '',             label: '—' },
    { v: 'circle',       label: '○' },
    { v: 'square',       label: '□' },
    { v: 'arrow-right',  label: '▶' },
    { v: 'arrow-left',   label: '◀' },
    { v: 'arrow-up',     label: '▲' },
    { v: 'arrow-down',   label: '▼' },
    { v: 'solid',        label: '■' },
  ];
  function protoDefault() {
    return Timeline.EVENTOS.map((e) => {
      const marker = MARKERS_DEFAULT[e.id] || '';
      const cor = marker && CORES_MARKER_DEFAULT[e.id]
        ? CORES_MARKER_DEFAULT[e.id]
        : (CORES_DEFAULT[e.id] || '#3498db');
      return {
        id: e.id,
        label: e.label,
        offset_dias: e.offset_dias,
        window: e.window ? [...e.window] : null,
        trimestre: e.trimestre,
        cor,
        opacidade: 100,
        icone: ICONES_DEFAULT[e.id] || '',
        marker,
        grupo: GRUPOS_DEFAULT[e.id] || 'ecografia',
        enabled: true,
      };
    });
  }
  function loadProto() {
    try {
      const raw = localStorage.getItem(PROTO_KEY);
      if (!raw) return protoDefault();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return protoDefault();
      // Migração: garante cor + opacidade + icone + marker + grupo
      parsed.forEach((ev) => {
        if (!ev.cor) ev.cor = CORES_DEFAULT[ev.id] || '#3498db';
        if (typeof ev.opacidade !== 'number') ev.opacidade = 100;
        if (typeof ev.icone !== 'string') ev.icone = ICONES_DEFAULT[ev.id] || '';
        if (typeof ev.marker !== 'string') ev.marker = MARKERS_DEFAULT[ev.id] || '';
        if (typeof ev.grupo !== 'string') ev.grupo = GRUPOS_DEFAULT[ev.id] || 'ecografia';
        if (ev.marker && isWhite(ev.cor) && CORES_MARKER_DEFAULT[ev.id]) {
          ev.cor = CORES_MARKER_DEFAULT[ev.id];
        }
        delete ev.forma;
      });
      return parsed;
    } catch (e) { return protoDefault(); }
  }
  function saveProto() { try { localStorage.setItem(PROTO_KEY, JSON.stringify(proto)); } catch (e) {} }
  function resetProto() {
    if (!confirm('Restaurar protocolo padrão?')) return;
    proto = protoDefault();
    saveProto();
    renderProto();
    render();
    toast('Protocolo restaurado', 'success');
  }

  let proto = loadProto();

  // ============ HELPERS ============
  const $ = (id) => document.getElementById(id);
  function today() { return new Date(); }
  function formatDateBR(d) {
    if (!d) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  // parseFlexDate e isoToShort vêm de GAMethods (lib/ga-methods.js)
  const parseFlexDate = GAMethods.parseFlexDate;
  const isoToShort = GAMethods.isoToShort;
  function toast(msg, tipo) {
    const c = $('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
  function formatSemanasTL(ev) {
    if (ev.window_offset) {
      const a = Math.round(ev.window_offset.start / 7);
      const b = Math.round(ev.window_offset.end / 7);
      return a !== b ? `${a}–${b} sem` : `${a} sem`;
    }
    return `${Math.round(ev.offset_dias / 7)} sem`;
  }
  function labelStatus(s, dias) {
    if (s === 'current') return 'agora';
    if (s === 'past') return `há ${Math.abs(dias)}d`;
    if (s === 'upcoming') return `em ${dias}d`;
    if (s === 'overdue') return 'atrasado';
    return s;
  }

  // ============ CALC por método ============
  function calcularMetodo(id) {
    const hoje = today();
    switch (id) {
      case 'dum':
        return state.dum ? GAMethods.porDUM(hoje, GAMethods.parseISO(state.dum)) : null;
      case 'ovulacao':
        return state.ovulacao ? GAMethods.porOvulacao(hoje, GAMethods.parseISO(state.ovulacao)) : null;
      case 'fiv5':
        return state.fiv5 ? GAMethods.porFIV5(hoje, GAMethods.parseISO(state.fiv5)) : null;
      case 'dpp':
        return state.dpp ? GAMethods.porDPP(hoje, GAMethods.parseISO(state.dpp)) : null;
      case 'manual':
        if (state.manual_sem === '' || state.manual_dias === '') return null;
        return GAMethods.porIGManual(hoje, state.manual_sem, state.manual_dias);
      case 'us':
        if (!state.us.data || state.us.sem === '' || state.us.dias === '') return null;
        return GAMethods.porUSAnterior(hoje,
          GAMethods.parseISO(state.us.data),
          state.us.sem, state.us.dias, 'US anterior');
      default:
        return null;
    }
  }

  // ============ RENDER: estrutura dos métodos (chamado uma vez) ============
  function buildMethods() {
    const container = $('methodsList');
    container.innerHTML = '';

    METODOS.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'igb-method';
      row.dataset.id = m.id;

      row.innerHTML = `
        <div class="igb-method-radio"></div>
        <div class="igb-method-label">${m.label}</div>
        <div class="igb-method-inputs">${renderInputs(m)}</div>
        <div class="igb-method-ig">—<small>&nbsp;</small></div>
      `;
      container.appendChild(row);

      // clique na linha (exceto nos inputs) → seleciona
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const r = calcularMetodo(m.id);
        if (r && r.valid) selectMethod(m.id);
      });

      // eventos dos inputs
      row.querySelectorAll('[data-k]').forEach((inp) => {
        inp.addEventListener('input', () => handleInput(m, inp));
        if (inp.dataset.kind === 'date') {
          inp.addEventListener('blur', () => handleBlurDate(inp));
        }
      });
    });
  }

  function renderInputs(m) {
    if (m.tipo === 'date') {
      const v = isoToShort(state[m.campo] || '');
      return `<input type="text" inputmode="numeric" class="form-input" placeholder="d/m/aa" autocomplete="off" data-k="${m.campo}" data-kind="date" value="${v}">`;
    }
    if (m.tipo === 'sem_dias') {
      return `
        <input type="number" class="form-input form-input-compact" placeholder="sem" min="0" max="45" value="${state.manual_sem}" data-k="manual_sem">
        <input type="number" class="form-input form-input-compact" placeholder="dias" min="0" max="6" value="${state.manual_dias}" data-k="manual_dias">
      `;
    }
    if (m.tipo === 'us') {
      const v = isoToShort(state.us.data || '');
      return `
        <input type="text" inputmode="numeric" class="form-input" placeholder="d/m/aa" autocomplete="off" data-k="us_data" data-kind="date" value="${v}" style="flex: 1 1 100%; min-width: 90px;">
        <input type="number" class="form-input form-input-compact" placeholder="sem" min="0" max="45" value="${state.us.sem}" data-k="us_sem">
        <input type="number" class="form-input form-input-compact" placeholder="dias" min="0" max="6" value="${state.us.dias}" data-k="us_dias">
      `;
    }
    return '';
  }

  function commit(k, val) {
    if (k === 'us_data') state.us.data = val;
    else if (k === 'us_sem') state.us.sem = val;
    else if (k === 'us_dias') state.us.dias = val;
    else state[k] = val;
  }

  function handleInput(m, inp) {
    const k = inp.dataset.k;
    const kind = inp.dataset.kind;
    const val = inp.value;

    if (kind === 'date') {
      const trimmed = val.trim();
      if (!trimmed) {
        inp.classList.remove('error');
        commit(k, '');
      } else {
        const iso = parseFlexDate(trimmed);
        if (iso) {
          inp.classList.remove('error');
          commit(k, iso);
        }
        // se não parseou ainda, não commita — usuário pode estar digitando
      }
    } else {
      commit(k, val);
    }

    // auto-select + deselect-if-invalid
    const r = calcularMetodo(m.id);
    if (r && r.valid && !state.selected) state.selected = m.id;
    if (state.selected) {
      const curr = calcularMetodo(state.selected);
      if (!curr || !curr.valid) state.selected = null;
    }
    saveState();
    render();
  }

  function handleBlurDate(inp) {
    const val = inp.value.trim();
    if (!val) { inp.classList.remove('error'); return; }
    const iso = parseFlexDate(val);
    if (iso) {
      inp.classList.remove('error');
      inp.value = isoToShort(iso); // normaliza exibição
    } else {
      inp.classList.add('error');
    }
  }

  /** Atualiza apenas as classes e célula IG de cada row — preserva inputs/focus. */
  function refreshMethodsDisplay() {
    METODOS.forEach((m) => {
      const row = document.querySelector(`.igb-method[data-id="${m.id}"]`);
      if (!row) return;
      const r = calcularMetodo(m.id);
      const valid = !!(r && r.valid);
      row.classList.toggle('selected', state.selected === m.id && valid);
      row.classList.toggle('invalid', !!r && !valid);

      const ig = row.querySelector('.igb-method-ig');
      if (!ig) return;
      if (valid) {
        ig.innerHTML = `${Biometria.formatarIG(r.ig_dias, 'curto')}<small>DPP ${formatDateBR(r.dpp)}</small>`;
        ig.style.cssText = '';
      } else if (r && r.motivo_invalido) {
        ig.innerHTML = `${r.motivo_invalido}<small>&nbsp;</small>`;
        ig.style.cssText = 'color: var(--accent-orange); font-size: 11px;';
      } else {
        ig.innerHTML = `—<small>&nbsp;</small>`;
        ig.style.cssText = 'color: var(--text-dim); font-size: 11px;';
      }
    });
  }

  function selectMethod(id) {
    state.selected = id;
    saveState();
    render();
  }

  // ============ RENDER: banner IG ============
  function renderBanner() {
    const banner = $('banner');
    const r = state.selected ? calcularMetodo(state.selected) : null;
    const hojeTxt = `hoje: <strong>${formatDateBR(today())}</strong>`;

    if (!r || !r.valid) {
      banner.classList.add('empty');
      $('bannerBadge').textContent = '◌ nenhum método';
      $('bannerRef').innerHTML = hojeTxt;
      $('bannerMain').textContent = '—';
      $('bannerSub').textContent = 'Preencha uma entrada e clique no círculo para selecionar o método.';
      return;
    }
    banner.classList.remove('empty');
    $('bannerBadge').textContent = '● ' + r.label.toUpperCase();
    $('bannerRef').innerHTML = hojeTxt;
    $('bannerMain').textContent = Biometria.formatarIG(r.ig_dias, 'longo');
    $('bannerSub').innerHTML =
      `DPP: <strong>${formatDateBR(r.dpp)}</strong> &middot; ${r.descricao || ''}`;
  }

  /** Obtém a lista de eventos da timeline baseada na seleção atual (ou null). */
  function getCurrentTimelineEvents() {
    const r = state.selected ? calcularMetodo(state.selected) : null;
    if (!r || !r.valid) return null;
    const eventosAtivos = proto.filter((e) => e.enabled);
    return Timeline.gerarTimeline(r.dpp, today(), eventosAtivos);
  }

  // ============ RENDER: timeline ============
  function renderTimeline() {
    const body = $('timelineBody');
    const tl = getCurrentTimelineEvents();

    if (!tl) {
      body.innerHTML = '<div class="iga-results-hint">Selecione um método à esquerda para gerar a timeline.</div>';
      return;
    }
    body.innerHTML = '';

    let lastTrimestre = null;
    tl.forEach((ev) => {
      if (ev.trimestre !== lastTrimestre) {
        const div = document.createElement('div');
        div.className = 'iga-tl-trimestre';
        div.textContent = `${ev.trimestre}º trimestre`;
        body.appendChild(div);
        lastTrimestre = ev.trimestre;
      }
      const row = document.createElement('div');
      row.className = 'iga-tl-row ' + ev.status;
      const dateCell = ev.window
        ? `${formatDateBR(ev.window.start)}<span class="range-sep">–</span>${formatDateBR(ev.window.end)}`
        : formatDateBR(ev.date);
      // cor do texto do nome: cor do evento com opacidade (se não for branco/vazio)
      let corStyle = '';
      if (ev.cor && !isWhite(ev.cor)) {
        const op = (typeof ev.opacidade === 'number') ? ev.opacidade : 100;
        const corTexto = op >= 100 ? ev.cor : hexToRgba(ev.cor, op / 100);
        corStyle = ` style="color: ${corTexto};"`;
      }
      const iconePrefix = ev.icone ? `<span class="iga-tl-label-icon">${ev.icone}</span> ` : '';
      row.innerHTML = `
        <div class="iga-tl-dot"></div>
        <div class="iga-tl-label"${corStyle}>${iconePrefix}${ev.label}</div>
        <div class="iga-tl-sem">${formatSemanasTL(ev)}</div>
        <div class="iga-tl-date">${dateCell}</div>
        <div class="iga-tl-status ${ev.status}">${labelStatus(ev.status, ev.dias_ate)}</div>
      `;
      body.appendChild(row);
    });
  }

  function isWhite(c) {
    if (!c) return true;
    const s = String(c).toLowerCase().trim();
    return s === '#fff' || s === '#ffffff' || s === 'white' || s === 'rgb(255, 255, 255)';
  }

  /** Converte #rrggbb para rgba com alpha (0..1). */
  function hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return hex;
    const h = hex.replace('#', '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // ============ RENDER: calendário de 2 meses ============
  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  /** Dado um Date, retorna quantos dias até segunda-feira anterior (inclusive). */
  function diasAteSegunda(d) {
    // getDay: 0=dom, 1=seg, 2=ter, ..., 6=sáb
    const wd = d.getDay();
    return wd === 0 ? 6 : wd - 1;
  }

  function mesmoDia(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  /**
   * Retorna eventos que devem PINTAR O FUNDO do dia.
   * Eventos com marker usam a cor no marker, não no fundo — são excluídos.
   */
  function eventosDoDia(d, tlEvents) {
    if (!tlEvents) return [];
    const list = [];
    for (const ev of tlEvents) {
      if (!ev.cor || isWhite(ev.cor)) continue;
      if (ev.marker) continue; // marker usa a cor, bg fica limpo
      const start = ev.window ? ev.window.start : ev.date;
      const end = ev.window ? ev.window.end : ev.date;
      if (d >= stripTime(start) && d <= stripTime(end)) list.push(ev);
    }
    return list;
  }
  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const CAL_MONTHS_BEFORE = 12;
  const CAL_MONTHS_AFTER = 14;
  let _calScrolledOnce = false;

  function renderCalendar() {
    const container = $('calendarBody');
    if (!container) return;
    const tl = getCurrentTimelineEvents();
    const hj = stripTime(today());
    const prevScroll = container.scrollTop;

    container.innerHTML = '';
    let currentMonthEl = null;
    for (let offset = -CAL_MONTHS_BEFORE; offset <= CAL_MONTHS_AFTER; offset++) {
      const month = new Date(hj.getFullYear(), hj.getMonth() + offset, 1);
      const el = renderMonth(month, tl, hj);
      if (offset === 0) currentMonthEl = el;
      container.appendChild(el);
    }

    if (!_calScrolledOnce && currentMonthEl) {
      // na 1ª renderização, posiciona o mês atual no topo
      requestAnimationFrame(() => {
        currentMonthEl.scrollIntoView({ block: 'start', behavior: 'instant' });
        _calScrolledOnce = true;
      });
    } else {
      container.scrollTop = prevScroll;
    }
  }

  function renderMonth(monthStart, tl, hoje, opts) {
    opts = opts || {};
    const forPrint = !!opts.forPrint;
    const y = monthStart.getFullYear();
    const m = monthStart.getMonth();
    const primeiroDia = new Date(y, m, 1);

    const offsetInicio = diasAteSegunda(primeiroDia);
    const inicioGrid = new Date(y, m, 1 - offsetInicio);

    const wrap = document.createElement('div');
    wrap.className = 'igb-cal-month';

    const head = document.createElement('div');
    head.className = 'igb-cal-head';
    head.textContent = `${MONTHS_PT[m]} ${y}`;
    wrap.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'igb-cal-grid';

    WEEKDAYS.forEach((wd) => {
      const c = document.createElement('div');
      c.className = 'igb-cal-wd';
      c.textContent = wd;
      grid.appendChild(c);
    });

    for (let i = 0; i < 42; i++) {
      const d = new Date(inicioGrid.getFullYear(), inicioGrid.getMonth(), inicioGrid.getDate() + i);
      const cell = document.createElement('div');
      cell.className = 'igb-cal-day';
      const isOtherMonth = d.getMonth() !== m;
      if (isOtherMonth) cell.classList.add('other-month');
      if (mesmoDia(d, hoje)) cell.classList.add('today');
      const isPast = d < hoje;
      if (isPast) cell.classList.add('past');

      // Números de outro mês: só mostra o número, não aplica eventos
      if (isOtherMonth) {
        const numSpan = document.createElement('span');
        numSpan.className = 'igb-cal-day-num';
        numSpan.textContent = String(d.getDate());
        cell.appendChild(numSpan);
        grid.appendChild(cell);
        continue;
      }

      const hits = eventosDoDia(d, tl);
      if (hits.length) {
        const cores = hits.map((h) => {
          const op = (typeof h.opacidade === 'number') ? h.opacidade : 100;
          if (forPrint) {
            // Print: fadeColor com ajuste por opacidade (menor opacidade = mais claro)
            const mix = 1 - (op / 100) * 0.35;
            return fadeColor(h.cor, Math.max(0, Math.min(1, mix)));
          }
          return hexToRgba(h.cor, op / 100);
        });
        if (cores.length === 1) {
          cell.style.background = cores[0];
          cell.style.color = forPrint ? '#0a0a12' : contrasteTexto(hits[0].cor);
        } else {
          // 2+: divide em faixas horizontais de altura igual
          const step = 100 / cores.length;
          const stops = [];
          cores.forEach((c, i) => {
            stops.push(`${c} ${i * step}%`);
            stops.push(`${c} ${(i + 1) * step}%`);
          });
          cell.style.background = `linear-gradient(to bottom, ${stops.join(', ')})`;
          // texto legível sobre múltiplas cores
          if (forPrint) {
            cell.style.color = '#0a0a12';
          } else {
            cell.style.color = '#ffffff';
            cell.style.textShadow = '0 0 3px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)';
          }
        }
        cell.title = hits.map((h) => h.label).join(' · ');
        cell.classList.add('has-event');
      }
      // Número do dia num span posicionado (z-index 1) pra ficar acima do marker
      const numSpan = document.createElement('span');
      numSpan.className = 'igb-cal-day-num';
      numSpan.textContent = String(d.getDate());
      cell.appendChild(numSpan);

      // Marker (triângulo/círculo/quadrado) no dia de início do evento.
      // Fica DENTRO da célula, atrás do número (z-index 0 < número z-index 1).
      if (tl) {
        for (const ev of tl) {
          if (!ev.marker) continue;
          const inicio = ev.window ? stripTime(ev.window.start) : stripTime(ev.date);
          if (!mesmoDia(d, inicio)) continue;
          const baseCor = (ev.cor && !isWhite(ev.cor)) ? ev.cor : '#64748b';
          const op = (typeof ev.opacidade === 'number') ? ev.opacidade : 100;
          const corFinal = forPrint
            ? fadeColor(baseCor, Math.max(0, Math.min(1, 1 - (op / 100) * 0.35)))
            : hexToRgba(baseCor, op / 100);
          const m = document.createElement('span');
          m.className = 'igb-cal-day-marker mark-' + ev.marker;
          m.style.color = corFinal;
          cell.appendChild(m);
          cell.classList.add('has-marker');
          break; // um marker por célula
        }
      }

      // Ícones: pequenos no canto superior direito, no início OU fim da janela
      const icones = [];
      if (tl) {
        for (const ev of tl) {
          if (!ev.icone) continue;
          const inicio = ev.window ? stripTime(ev.window.start) : stripTime(ev.date);
          const fim = ev.window ? stripTime(ev.window.end) : stripTime(ev.date);
          if (mesmoDia(d, inicio) || mesmoDia(d, fim)) icones.push(ev.icone);
        }
      }
      if (icones.length) {
        const ic = document.createElement('span');
        ic.className = 'igb-cal-day-icon';
        ic.textContent = icones.join('');
        cell.appendChild(ic);
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /** Mistura cor hex com branco para versão desbotada (para print). mix=0..1 */
  function fadeColor(hex, mix) {
    if (!hex || hex[0] !== '#') return hex;
    const h = hex.replace('#', '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const mr = Math.round(r + (255 - r) * mix);
    const mg = Math.round(g + (255 - g) * mix);
    const mb = Math.round(b + (255 - b) * mix);
    return `rgb(${mr}, ${mg}, ${mb})`;
  }

  /**
   * Renderiza o calendário completo da gestação (DUM → DPP+1mês) para impressão.
   * Chamado antes de window.print() e usado pelo container .igb-print-only.
   */
  function renderPrintCalendar() {
    const container = $('printCalendarBody');
    if (!container) return;
    container.innerHTML = '';
    const r = state.selected ? calcularMetodo(state.selected) : null;
    if (!r || !r.valid) {
      container.innerHTML = '<div style="color:#666; font-size:12px;">Selecione um método válido para gerar o calendário completo.</div>';
      return;
    }
    const tl = getCurrentTimelineEvents();
    const dpp = r.dpp;
    const dum = new Date(dpp.getFullYear(), dpp.getMonth(), dpp.getDate() - 280);
    const fim = new Date(dpp.getFullYear(), dpp.getMonth() + 1, 0);
    // Range: do mês da DUM ao mês após a DPP
    const start = new Date(dum.getFullYear(), dum.getMonth(), 1);
    const lastMonth = new Date(fim.getFullYear(), fim.getMonth(), 1);
    const cursor = new Date(start);
    const hj = stripTime(today());
    while (cursor <= lastMonth) {
      container.appendChild(renderMonth(new Date(cursor), tl, hj, { forPrint: true }));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  /** Preto ou branco baseado no brilho da cor de fundo (para legibilidade). */
  function contrasteTexto(hex) {
    if (!hex) return 'inherit';
    const h = hex.replace('#', '');
    if (h.length !== 6) return 'inherit';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 150 ? '#0a0a12' : '#ffffff';
  }

  // ============ RENDER: protocolo editor ============
  function renderProto() {
    const list = $('protoList');
    list.innerHTML = '';

    // header
    const h = document.createElement('div');
    h.className = 'igb-proto-header';
    h.innerHTML = `<div>on</div><div>nome</div><div>início (d)</div><div>fim (d)</div><div>trim.</div><div>cor</div><div>op%</div><div>ícone</div><div>marker</div><div></div>`;
    list.appendChild(h);

    proto.forEach((ev, idx) => {
      const row = document.createElement('div');
      row.className = 'igb-proto-row' + (!ev.enabled ? ' disabled' : '');

      const start = ev.window ? ev.window[0] : ev.offset_dias;
      const end = ev.window ? ev.window[1] : '';
      const cor = ev.cor || '#ffffff';
      const op = (typeof ev.opacidade === 'number') ? ev.opacidade : 100;
      const icone = ev.icone || '';
      const markerAtual = ev.marker || '';
      const markerSelect = MARKER_OPTS.map((o) =>
        `<option value="${o.v}"${o.v === markerAtual ? ' selected' : ''}>${o.label}</option>`
      ).join('');

      row.innerHTML = `
        <input type="checkbox" class="igb-proto-check" ${ev.enabled ? 'checked' : ''} data-k="enabled">
        <input type="text" value="${ev.label.replace(/"/g, '&quot;')}" data-k="label">
        <input type="number" value="${start}" min="0" max="320" data-k="start" title="dias a partir da DUM">
        <input type="number" value="${end}" min="0" max="320" placeholder="—" data-k="end" title="fim da janela (vazio = evento pontual)">
        <input type="number" value="${ev.trimestre}" min="1" max="3" data-k="trimestre">
        <input type="color" class="igb-proto-color" value="${cor}" data-k="cor" title="cor do evento (branco = sem fundo no calendário)">
        <input type="number" value="${op}" min="0" max="100" step="5" data-k="opacidade" title="opacidade da cor (0-100%)">
        <input type="text" class="igb-proto-icone" value="${icone.replace(/"/g, '&quot;')}" maxlength="4" placeholder="—" data-k="icone" title="emoji/ícone no canto superior direito">
        <select class="igb-proto-marker" data-k="marker" title="marcador que aparece ao redor do número do dia">${markerSelect}</select>
        <button class="igb-proto-remove" data-remove title="Remover">✕</button>
      `;
      list.appendChild(row);

      row.querySelectorAll('[data-k]').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const k = e.target.dataset.k;
          if (k === 'enabled') ev.enabled = e.target.checked;
          else if (k === 'label') ev.label = e.target.value;
          else if (k === 'trimestre') ev.trimestre = Number(e.target.value) || 1;
          else if (k === 'cor') ev.cor = e.target.value;
          else if (k === 'icone') ev.icone = e.target.value;
          else if (k === 'marker') ev.marker = e.target.value;
          else if (k === 'opacidade') {
            const n = Number(e.target.value);
            ev.opacidade = isNaN(n) ? 100 : Math.max(0, Math.min(100, n));
          }
          else if (k === 'start') {
            const n = Number(e.target.value);
            ev.offset_dias = n;
            if (ev.window) ev.window[0] = n;
          } else if (k === 'end') {
            const n = Number(e.target.value);
            if (e.target.value === '') ev.window = null;
            else ev.window = [ev.window ? ev.window[0] : ev.offset_dias, n];
          }
          saveProto();
          render();
        });
      });
      row.querySelector('[data-remove]').addEventListener('click', () => {
        if (!confirm(`Remover "${ev.label}"?`)) return;
        proto.splice(idx, 1);
        saveProto();
        renderProto();
        render();
      });
    });
  }

  function addProtoEvent() {
    const novo = {
      id: 'custom_' + Date.now(),
      label: 'Novo evento',
      offset_dias: 140,
      window: null,
      trimestre: 2,
      cor: '#3498db',
      opacidade: 100,
      icone: '',
      marker: '',
      enabled: true,
    };
    proto.push(novo);
    proto.sort((a, b) => a.offset_dias - b.offset_dias);
    saveProto();
    renderProto();
    render();
  }

  // ============ HYDRATE (estrutura inicial) ============
  function hydrate() {
    buildMethods();   // cria a estrutura dos inputs uma única vez
    renderProto();
  }

  // ============ RENDER MASTER (apenas displays — preserva focus dos inputs) ============
  function render() {
    refreshMethodsDisplay();
    renderBanner();
    renderCalendar();
    renderTimeline();
  }

  // ============ VISUALIZAÇÃO COMPLETA ============
  function openFullView() {
    const r = state.selected ? calcularMetodo(state.selected) : null;
    if (!r || !r.valid) {
      toast('Selecione um método válido primeiro', 'warning');
      return;
    }
    const fv = $('fullView');
    fv.hidden = false;
    document.body.style.overflow = 'hidden';

    const dpp = r.dpp;
    const dum = new Date(dpp.getFullYear(), dpp.getMonth(), dpp.getDate() - 280);
    const posTermo = new Date(dpp.getFullYear(), dpp.getMonth(), dpp.getDate() + 14);

    // Subtítulo
    const nome = state.paciente ? state.paciente : '—';
    $('fullViewTitulo').textContent = `Calendário da gestação — ${nome}`;
    $('fullViewSub').innerHTML =
      `<strong>${Biometria.formatarIG(r.ig_dias, 'longo')}</strong> &middot; ` +
      `DPP <strong>${formatDateBR(dpp)}</strong> &middot; ` +
      `${r.descricao || ''}`;

    // Calendário: do mês da DUM ao mês do 42ª sem
    const container = $('fullCalBody');
    container.innerHTML = '';
    const tl = getCurrentTimelineEvents();
    const hj = stripTime(today());
    const cursor = new Date(dum.getFullYear(), dum.getMonth(), 1);
    const fimMes = new Date(posTermo.getFullYear(), posTermo.getMonth(), 1);
    while (cursor <= fimMes) {
      container.appendChild(renderMonth(new Date(cursor), tl, hj));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    renderLegenda();
  }
  function closeFullView() {
    $('fullView').hidden = true;
    document.body.style.overflow = '';
  }

  function renderLegenda() {
    const ulMarc = $('legendMarcadores');
    const ulEco = $('legendEcografias');
    ulMarc.innerHTML = '';
    ulEco.innerHTML = '';
    proto.filter((e) => e.enabled).forEach((ev) => {
      const destino = (ev.grupo === 'marcador') ? ulMarc : ulEco;
      destino.appendChild(legendaItem(ev));
    });
    if (!ulMarc.children.length) ulMarc.innerHTML = '<li class="legend-empty">—</li>';
    if (!ulEco.children.length) ulEco.innerHTML = '<li class="legend-empty">—</li>';
  }

  function legendaItem(ev) {
    const li = document.createElement('li');
    li.className = 'legend-item';
    const chip = document.createElement('span');
    chip.className = 'legend-chip';
    if (ev.marker) {
      const m = document.createElement('span');
      m.className = 'igb-cal-day-marker mark-' + ev.marker;
      m.style.color = ev.cor || '#999';
      chip.appendChild(m);
    } else if (ev.cor && !isWhite(ev.cor)) {
      chip.style.background = ev.cor;
    } else {
      chip.style.background = 'transparent';
      chip.style.border = '1px dashed var(--border)';
    }
    if (ev.icone) {
      const ic = document.createElement('span');
      ic.className = 'legend-icon';
      ic.textContent = ev.icone;
      chip.appendChild(ic);
    }
    li.appendChild(chip);

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = ev.label;
    li.appendChild(label);

    // Janela de IG
    const sem = document.createElement('span');
    sem.className = 'legend-sem';
    if (ev.window) {
      const a = Math.round(ev.window[0] / 7), b = Math.round(ev.window[1] / 7);
      sem.textContent = a !== b ? `${a}–${b} sem` : `${a} sem`;
    } else {
      sem.textContent = `${Math.round(ev.offset_dias / 7)} sem`;
    }
    li.appendChild(sem);
    return li;
  }

  // ============ EXPORT / IMPORT ============
  function exportConfig() {
    const envelope = {
      type: 'ig-basica-config',
      version: 1,
      exported_at: new Date().toISOString(),
      state: state,
      protocolo: proto,
    };
    const json = JSON.stringify(envelope, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (state.paciente || 'config').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ig-basica-${safeName}-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Configuração exportada', 'success');
  }

  function onImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.type !== 'ig-basica-config') {
          toast('Arquivo não é uma configuração válida da IG-basica', 'error');
          return;
        }
        const escolha = prompt(
          'O que importar?\n\n' +
          '1 — Protocolo + dados da paciente\n' +
          '2 — Só o protocolo (mantém paciente atual)\n\n' +
          'Digite 1 ou 2 (vazio = cancelar):'
        );
        if (escolha !== '1' && escolha !== '2') return;

        if (escolha === '1') {
          state = Object.assign(defaultState(), data.state || {});
          proto = Array.isArray(data.protocolo) && data.protocolo.length
            ? data.protocolo : protoDefault();
        } else {
          proto = Array.isArray(data.protocolo) && data.protocolo.length
            ? data.protocolo : protoDefault();
        }
        // migração: garante que todo evento tenha cor
        proto.forEach((ev) => {
          if (!ev.cor) ev.cor = CORES_DEFAULT[ev.id] || '#3498db';
        });
        saveState();
        saveProto();

        hydrate();
        const nomeInput = $('pacienteNome');
        if (nomeInput) nomeInput.value = state.paciente || '';
        render();
        toast(escolha === '1' ? 'Protocolo + dados importados' : 'Protocolo importado', 'success');
      } catch (err) {
        toast('Erro ao ler arquivo: ' + err.message, 'error');
      } finally {
        e.target.value = ''; // permite re-importar mesmo arquivo
      }
    };
    reader.readAsText(file);
  }

  // ============ INIT ============
  function init() {
    $('hojeDisplay').textContent = formatDateBR(today());
    hydrate();
    render();

    // Campo do nome da paciente
    const nomeInput = $('pacienteNome');
    if (nomeInput) {
      nomeInput.value = state.paciente || '';
      nomeInput.addEventListener('input', (e) => {
        state.paciente = e.target.value;
        saveState();
      });
    }

    $('btnLimpar').addEventListener('click', clearState);
    $('btnProtoReset').addEventListener('click', resetProto);
    $('btnProtoAdd').addEventListener('click', addProtoEvent);

    $('btnExport').addEventListener('click', exportConfig);
    $('btnImport').addEventListener('click', () => $('importFileInput').click());
    $('importFileInput').addEventListener('change', onImportFile);

    $('btnImprimir').addEventListener('click', () => {
      renderPrintCalendar();
      // pequeno delay pra garantir que o DOM atualizou antes do print dialog
      setTimeout(() => window.print(), 50);
    });

    $('btnFullView').addEventListener('click', openFullView);
    $('btnFullClose').addEventListener('click', closeFullView);
    $('btnFullPrint').addEventListener('click', () => {
      document.body.classList.add('igb-printing-full');
      setTimeout(() => {
        window.print();
        document.body.classList.remove('igb-printing-full');
      }, 50);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('fullView').hidden) closeFullView();
    });

    $('protoToggle').addEventListener('click', () => {
      const body = $('protoBody');
      const chev = $('protoChev');
      body.hidden = !body.hidden;
      chev.classList.toggle('open', !body.hidden);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
