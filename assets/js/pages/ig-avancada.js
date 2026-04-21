/**
 * ig-avancada.js — controller da página IG-avancada.
 * Integra Biometria, GAMethods e Timeline numa UI única.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'ig-avancada-v1';

  // ============ STATE ============
  const defaultState = () => ({
    dum: '',
    ovulacao: '',
    fiv3: '',
    fiv5: '',
    dpp: '',
    manual_sem: '',
    manual_dias: '',
    us_anteriores: [],
    biometria: {},          // { ccn: { mm, formula }, ... }
    peso: { formula: 'hadlock_3c', dbp: '', hc: '', ac: '', fl: '' },
    lock: null,             // { method_id, ig_dias, dpp, locked_at, descricao, history }
    locks_archive: [],      // locks arquivados por destravamento (audit trail)
    selected_method: null,  // método atualmente selecionado na tabela
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* ignore */ }
  }
  function clearState() {
    if (!confirm('Limpar todas as entradas?\n\nA IG definida será mantida se estiver travada.')) return;
    const lock = state.lock;
    state = defaultState();
    state.lock = lock;
    saveState();
    location.reload();
  }

  // ============ DOM ============
  const $ = (id) => document.getElementById(id);

  // ============ HELPERS ============
  function today() { return new Date(); }
  function formatDateBR(d) {
    if (!d) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  function formatDateISO(d) { return GAMethods.iso(d); }
  function toast(msg, tipo) {
    const c = $('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ============ RENDER HOJE ============
  function renderHoje() {
    $('hojeDisplay').textContent = formatDateBR(today());
  }

  // ============ INPUTS POR DATA ============
  const CAMPOS_DATA = ['dum', 'ovulacao', 'fiv3', 'fiv5', 'dpp'];
  const CAMPOS_NUM = ['manual_sem', 'manual_dias'];

  function hydrateDateInputs() {
    CAMPOS_DATA.forEach((k) => {
      const inp = document.querySelector(`[data-k="${k}"]`);
      if (inp) inp.value = GAMethods.isoToShort(state[k] || '');
    });
    CAMPOS_NUM.forEach((k) => {
      const inp = document.querySelector(`[data-k="${k}"]`);
      if (inp) inp.value = state[k] || '';
    });
  }

  function bindDateInputs() {
    document.querySelectorAll('[data-k]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const k = e.target.dataset.k;
        const kind = e.target.dataset.kind;
        const val = e.target.value;
        if (kind === 'date') {
          const trimmed = val.trim();
          if (!trimmed) {
            e.target.classList.remove('error');
            state[k] = '';
          } else {
            const iso = GAMethods.parseFlexDate(trimmed);
            if (iso) {
              e.target.classList.remove('error');
              state[k] = iso;
            }
            // parcial/ainda digitando — não commita
          }
        } else {
          state[k] = val;
        }
        saveState();
        render();
      });
      if (inp.dataset.kind === 'date') {
        inp.addEventListener('blur', (e) => {
          const val = e.target.value.trim();
          if (!val) { e.target.classList.remove('error'); return; }
          const iso = GAMethods.parseFlexDate(val);
          if (iso) {
            e.target.classList.remove('error');
            e.target.value = GAMethods.isoToShort(iso);
          } else {
            e.target.classList.add('error');
          }
        });
      }
    });
  }

  // ============ US ANTERIORES ============
  function uid() { return 'us_' + Math.random().toString(36).slice(2, 9); }

  function addUS() {
    state.us_anteriores.push({
      id: uid(),
      data: '',
      modo: 'ig_conhecida',   // 'ig_conhecida' ou 'ccn'
      sem: '',
      dias: '',
      ccn: '',
      formula: 'ccn_robinson',
    });
    saveState();
    renderUSList();
    render();
  }

  function removeUS(id) {
    state.us_anteriores = state.us_anteriores.filter((u) => u.id !== id);
    saveState();
    renderUSList();
    render();
  }

  function updateUS(id, patch) {
    const u = state.us_anteriores.find((x) => x.id === id);
    if (!u) return;
    Object.assign(u, patch);
    saveState();
    render();
  }

  function renderUSList() {
    const list = $('usList');
    list.innerHTML = '';
    if (state.us_anteriores.length === 0) {
      list.innerHTML = '<div class="iga-group-empty">Nenhum ultrassom adicionado.</div>';
      return;
    }
    state.us_anteriores.forEach((u, idx) => {
      const item = document.createElement('div');
      item.className = 'iga-us-item';
      const ccnFormulas = Biometria.CATALOGO.find((c) => c.id === 'ccn').formulas;
      const formulaOpts = ccnFormulas.map((f) =>
        `<option value="${f.id}" ${u.formula === f.id ? 'selected' : ''}>${f.nome}</option>`
      ).join('');
      item.innerHTML = `
        <div class="iga-us-item-head">
          <span>US anterior #${idx + 1}</span>
          <button class="iga-us-item-remove" data-remove="${u.id}" title="Remover">✕</button>
        </div>
        <div class="iga-us-item-row">
          <input type="text" inputmode="numeric" autocomplete="off" class="form-input" placeholder="d/m/aa" data-us-id="${u.id}" data-us-k="data" data-kind="date" value="${GAMethods.isoToShort(u.data || '')}">
        </div>
        <div class="iga-us-item-mode">
          <label><input type="radio" name="mode-${u.id}" data-us-id="${u.id}" data-us-k="modo" value="ig_conhecida" ${u.modo === 'ig_conhecida' ? 'checked' : ''}> IG no dia do US</label>
          <label><input type="radio" name="mode-${u.id}" data-us-id="${u.id}" data-us-k="modo" value="ccn" ${u.modo === 'ccn' ? 'checked' : ''}> Medida CCN</label>
        </div>
        ${u.modo === 'ig_conhecida' ? `
          <div class="iga-us-item-sd">
            <input type="number" class="form-input form-input-compact" placeholder="sem" min="0" max="45" value="${u.sem}" data-us-id="${u.id}" data-us-k="sem">
            <input type="number" class="form-input form-input-compact" placeholder="dias" min="0" max="6" value="${u.dias}" data-us-id="${u.id}" data-us-k="dias">
          </div>
        ` : `
          <div class="iga-us-item-sd">
            <input type="number" class="form-input form-input-compact" placeholder="CCN mm" step="0.1" min="1" max="100" value="${u.ccn}" data-us-id="${u.id}" data-us-k="ccn">
            <select class="form-input" data-us-id="${u.id}" data-us-k="formula" style="flex:1;">${formulaOpts}</select>
          </div>
        `}
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('[data-us-id]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const id = e.target.dataset.usId;
        const k = e.target.dataset.usK;
        if (e.target.type === 'radio' && !e.target.checked) return;
        const val = e.target.value;

        if (e.target.dataset.kind === 'date') {
          const trimmed = val.trim();
          if (!trimmed) {
            e.target.classList.remove('error');
            updateUS(id, { [k]: '' });
          } else {
            const iso = GAMethods.parseFlexDate(trimmed);
            if (iso) {
              e.target.classList.remove('error');
              updateUS(id, { [k]: iso });
            }
            // parcial — não commita
          }
        } else {
          updateUS(id, { [k]: val });
          if (k === 'modo') renderUSList();
        }
      });
      if (inp.dataset.kind === 'date') {
        inp.addEventListener('blur', (e) => {
          const val = e.target.value.trim();
          if (!val) { e.target.classList.remove('error'); return; }
          const iso = GAMethods.parseFlexDate(val);
          if (iso) {
            e.target.classList.remove('error');
            e.target.value = GAMethods.isoToShort(iso);
          } else {
            e.target.classList.add('error');
          }
        });
      }
    });
    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeUS(btn.dataset.remove));
    });
  }

  // ============ BIOMETRIA ATUAL ============
  function renderBiometriaInputs() {
    const c = $('biometriaInputs');
    c.innerHTML = '';

    Biometria.CATALOGO.forEach((cat) => {
      const st = state.biometria[cat.id] || (state.biometria[cat.id] = {
        mm: '', mm2: '', formula: cat.default_id || cat.formulas[0].id
      });
      const row = document.createElement('div');
      const dual = cat.duas_medidas;
      row.className = 'iga-bio-row' + (dual ? ' dual' : '');
      row.dataset.bio = cat.id;

      const formulaOpts = cat.formulas.map((f) =>
        `<option value="${f.id}" ${st.formula === f.id ? 'selected' : ''}>${f.nome}</option>`
      ).join('');

      if (dual) {
        row.innerHTML = `
          <div class="iga-bio-label">${cat.parametro}</div>
          <input type="number" class="form-input iga-bio-mm" step="0.1" min="0" placeholder="CC" value="${st.mm}" data-bio-k="mm">
          <input type="number" class="form-input iga-bio-mm" step="0.1" min="0" placeholder="CF" value="${st.mm2}" data-bio-k="mm2">
          <select class="form-input iga-bio-formula" data-bio-k="formula">${formulaOpts}</select>
          <div class="iga-bio-result" data-bio-result></div>
        `;
      } else {
        row.innerHTML = `
          <div class="iga-bio-label" title="${cat.nome}">${cat.parametro}</div>
          <input type="number" class="form-input iga-bio-mm" step="0.1" min="0" placeholder="mm" value="${st.mm}" data-bio-k="mm">
          <select class="form-input iga-bio-formula" data-bio-k="formula">${formulaOpts}</select>
          <div class="iga-bio-result" data-bio-result></div>
        `;
      }
      c.appendChild(row);

      row.querySelectorAll('[data-bio-k]').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const k = e.target.dataset.bioK;
          st[k] = e.target.value;
          saveState();
          render();
        });
      });
    });
  }

  // ============ CALC ============
  function calcularTodos() {
    const hoje = today();
    const lista = [];

    // Por data
    if (state.dum) lista.push(GAMethods.porDUM(hoje, GAMethods.parseISO(state.dum)));
    if (state.ovulacao) lista.push(GAMethods.porOvulacao(hoje, GAMethods.parseISO(state.ovulacao)));
    if (state.fiv3) lista.push(GAMethods.porFIV3(hoje, GAMethods.parseISO(state.fiv3)));
    if (state.fiv5) lista.push(GAMethods.porFIV5(hoje, GAMethods.parseISO(state.fiv5)));
    if (state.dpp) lista.push(GAMethods.porDPP(hoje, GAMethods.parseISO(state.dpp)));
    if (state.manual_sem !== '' && state.manual_dias !== '') {
      lista.push(GAMethods.porIGManual(hoje, state.manual_sem, state.manual_dias));
    }

    // US anteriores
    state.us_anteriores.forEach((u, idx) => {
      if (!u.data) return;
      const dataObj = GAMethods.parseISO(u.data);
      const rotulo = `US anterior #${idx + 1}`;
      if (u.modo === 'ig_conhecida') {
        if (u.sem === '' || u.dias === '') return;
        const r = GAMethods.porUSAnterior(hoje, dataObj, u.sem, u.dias, rotulo);
        r.id = `us_${u.id}`;
        lista.push(r);
      } else if (u.modo === 'ccn') {
        if (!u.ccn) return;
        const cat = Biometria.CATALOGO.find((c) => c.id === 'ccn');
        const f = cat.formulas.find((x) => x.id === u.formula);
        if (!f) return;
        const igNoExame = f.fn(Number(u.ccn));
        const r = GAMethods.porUSAnteriorComMedida(
          hoje, dataObj, igNoExame,
          `baseado em CCN ${u.ccn}mm (${f.nome}) em US de ${GAMethods.iso(dataObj)}`
        );
        r.id = `us_medida_${u.id}`;
        r.label = `${rotulo} (CCN)`;
        r.sub = `${f.nome} · ${u.ccn}mm`;
        lista.push(r);
      }
    });

    // Biometria atual
    Biometria.CATALOGO.forEach((cat) => {
      const st = state.biometria[cat.id];
      if (!st || !st.mm) return;
      const f = cat.formulas.find((x) => x.id === st.formula) || cat.formulas[0];
      if (cat.duas_medidas) {
        if (!st.mm2) return;
        const ig = f.fn(Number(st.mm), Number(st.mm2));
        lista.push(bioResult(cat, f, ig, `${st.mm}+${st.mm2}mm`, hoje));
      } else {
        const ig = f.fn(Number(st.mm));
        lista.push(bioResult(cat, f, ig, `${st.mm}mm`, hoje));
      }
    });

    return lista;
  }

  function bioResult(cat, f, ig_dias, inputDesc, hoje) {
    const dpp = GAMethods.dppDeIG(hoje, ig_dias);
    const igSemanas = ig_dias / 7;
    const foraFaixa = f.faixa && (igSemanas < f.faixa[0] || igSemanas > f.faixa[1]);
    return {
      id: `bio_${cat.id}_${f.id}`,
      label: `${cat.parametro} (${f.nome})`,
      ig_dias, dpp, valid: true,
      descricao: `baseado em biometria ${cat.parametro} = ${inputDesc} (${f.nome})`,
      sub: inputDesc + ' · ' + f.nome,
      kind: 'biometria',
      forma_faixa: f.faixa,
      fora_faixa: foraFaixa,
    };
  }

  // ============ RENDER ============
  function render() {
    const lista = calcularTodos();
    renderLock();
    renderResults(lista);
    renderTimeline(lista);
    renderPeso();
  }

  function renderLock() {
    const card = $('lockCard');
    if (!state.lock) { card.hidden = true; return; }
    card.hidden = false;
    $('lockMain').textContent = Biometria.formatarIG(state.lock.ig_dias, 'longo');
    const dppDate = typeof state.lock.dpp === 'string' ? GAMethods.parseISO(state.lock.dpp) : state.lock.dpp;
    $('lockSub').innerHTML = `DPP <strong>${formatDateBR(dppDate)}</strong> · ${state.lock.descricao || ''}`;
    const lockedAt = state.lock.locked_at ? new Date(state.lock.locked_at) : null;
    const histCount = (state.lock.history || []).length;
    $('lockMeta').textContent = `travada em ${lockedAt ? formatDateBR(lockedAt) : '?'}${histCount ? ` · ${histCount} redefinição(ões) anteriores` : ''}`;
  }

  /**
   * Prioridade para a DPP de referência (delta + timeline):
   *   1. IG travada (lock)
   *   2. Método selecionado provisoriamente
   *   3. Primeiro método válido da lista (fallback)
   */
  function dppDeReferencia(lista) {
    if (state.lock) {
      return {
        date: typeof state.lock.dpp === 'string' ? GAMethods.parseISO(state.lock.dpp) : state.lock.dpp,
        source: 'lock',
        label: state.lock.descricao || 'IG travada',
        ig_dias: state.lock.ig_dias,
      };
    }
    if (state.selected_method) {
      const sel = lista.find((r) => r.id === state.selected_method);
      if (sel && sel.valid && sel.dpp) {
        return { date: sel.dpp, source: 'selected', label: sel.label, ig_dias: sel.ig_dias };
      }
    }
    const first = lista.find((r) => r.valid && r.dpp);
    return first ? { date: first.dpp, source: 'first', label: first.label, ig_dias: first.ig_dias } : null;
  }

  function renderResults(lista) {
    const hint = $('resultsHint');
    const table = $('resultsTable');
    const actions = $('resultsActions');
    const tbody = $('resultsTbody');

    if (lista.length === 0) {
      hint.hidden = false;
      table.hidden = true;
      actions.hidden = true;
      return;
    }
    hint.hidden = true;
    table.hidden = false;
    actions.hidden = false;

    const ref = dppDeReferencia(lista);
    const refDPP = ref ? ref.date : null;

    tbody.innerHTML = '';
    lista.forEach((r) => {
      const tr = document.createElement('tr');
      const valid = r.valid !== false;
      tr.className = (valid ? '' : 'invalido') + (r.fora_faixa ? ' fora-faixa' : '');
      tr.dataset.rid = r.id;
      if (state.selected_method === r.id) tr.classList.add('selected');

      let diffCell = '—';
      let diffCls = 'zero';
      if (valid && r.dpp && refDPP) {
        const diff = GAMethods.difDias(r.dpp, refDPP);
        const absd = Math.abs(diff);
        diffCls = diff === 0 ? 'zero' : (diff > 0 ? 'pos' : 'neg');
        if (absd >= 7) diffCls += ' big';
        diffCell = (diff >= 0 ? '+' : '') + diff + 'd';
      }

      const igCell = valid ? Biometria.formatarIG(r.ig_dias, 'curto') : '—';
      const dppCell = valid && r.dpp ? formatDateBR(r.dpp) : (r.motivo_invalido || '—');
      const faixaWarn = r.fora_faixa ? ` <span style="color:var(--accent-orange); font-size:10px;" data-tooltip="Fora da faixa de validade da fórmula">⚠</span>` : '';

      tr.innerHTML = `
        <td><input type="radio" name="method" ${state.selected_method === r.id ? 'checked' : ''} ${valid ? '' : 'disabled'}></td>
        <td>
          <div class="iga-cell-metodo">
            <span class="iga-cell-metodo-main">${r.label}${faixaWarn}</span>
            <span class="iga-cell-metodo-sub">${r.sub || r.descricao || ''}</span>
          </div>
        </td>
        <td class="iga-cell-ig">${igCell}</td>
        <td class="iga-cell-dpp">${dppCell}</td>
        <td class="iga-cell-diff ${diffCls}">${diffCell}</td>
      `;

      if (valid) {
        tr.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT') return; // let radio handle
          selectMethod(r.id);
        });
        tr.querySelector('input[type="radio"]').addEventListener('change', () => selectMethod(r.id));
      }
      tbody.appendChild(tr);
    });

    // Atualiza botão
    const btn = $('btnDefinirIG');
    btn.disabled = !state.selected_method;
    const sel = lista.find((r) => r.id === state.selected_method);
    if (sel) {
      btn.innerHTML = `🔒 Definir IG: ${sel.label} (${Biometria.formatarIG(sel.ig_dias, 'curto')})`;
    } else {
      btn.innerHTML = '🔒 Selecione um método para travar a IG';
    }
  }

  function selectMethod(id) {
    state.selected_method = id;
    saveState();
    render();
  }

  // ============ DEFINIR / REDEFINIR IG ============
  function calcularListaAtual() { return calcularTodos(); }

  function onDefinirIG() {
    const lista = calcularListaAtual();
    const sel = lista.find((r) => r.id === state.selected_method);
    if (!sel) return;

    if (state.lock) { openRedefinirModal(sel); return; }

    if (!confirm(`Travar IG como:\n\n${sel.label}\nIG: ${Biometria.formatarIG(sel.ig_dias, 'longo')}\nDPP: ${formatDateBR(sel.dpp)}\n\n${sel.descricao}\n\nConfirma?`)) return;

    state.lock = {
      method_id: sel.id,
      ig_dias: sel.ig_dias,
      reference_date: GAMethods.iso(today()),
      dpp: GAMethods.iso(sel.dpp),
      descricao: sel.descricao,
      locked_at: new Date().toISOString(),
      history: [],
    };
    saveState();
    render();
    toast('IG travada com sucesso', 'success');
  }

  function openRedefinirModal(novo) {
    const modal = $('modalRedefinir');
    modal.hidden = false;
    $('modalAntes').textContent = `${Biometria.formatarIG(state.lock.ig_dias, 'curto')} (${state.lock.descricao || ''})`;
    $('modalDepois').textContent = `${Biometria.formatarIG(novo.ig_dias, 'curto')} (${novo.descricao || novo.label})`;
    $('modalMotivo').value = '';
    $('modalMotivo').focus();
    modal._novo = novo;
  }

  function closeRedefinirModal() {
    $('modalRedefinir').hidden = true;
  }

  // ============ DESTRAVAR ============
  function openDestravarModal() {
    if (!state.lock) return;
    const m = $('modalDestravar');
    m.hidden = false;
    const dppDate = typeof state.lock.dpp === 'string' ? GAMethods.parseISO(state.lock.dpp) : state.lock.dpp;
    $('modalDestravarAtual').textContent =
      `${Biometria.formatarIG(state.lock.ig_dias, 'longo')} · DPP ${formatDateBR(dppDate)} · ${state.lock.descricao || ''}`;
    $('modalDestravarMotivo').value = '';
    $('modalDestravarMotivo').focus();
  }
  function closeDestravarModal() { $('modalDestravar').hidden = true; }
  function confirmarDestravar() {
    const motivo = $('modalDestravarMotivo').value.trim();
    if (motivo.length < 5) {
      toast('Motivo é obrigatório (mínimo 5 caracteres)', 'error');
      return;
    }
    if (!Array.isArray(state.locks_archive)) state.locks_archive = [];
    state.locks_archive.push({
      ...state.lock,
      unlocked_at: new Date().toISOString(),
      unlock_motivo: motivo,
    });
    state.lock = null;
    saveState();
    closeDestravarModal();
    render();
    toast('IG destravada — registro arquivado', 'success');
  }

  function confirmarRedefinir() {
    const motivo = $('modalMotivo').value.trim();
    if (motivo.length < 5) {
      toast('Motivo é obrigatório (mínimo 5 caracteres)', 'error');
      return;
    }
    const novo = $('modalRedefinir')._novo;
    // empilha histórico
    const prev = {
      timestamp: new Date().toISOString(),
      motivo,
      anterior: {
        method_id: state.lock.method_id,
        ig_dias: state.lock.ig_dias,
        dpp: state.lock.dpp,
        descricao: state.lock.descricao,
        locked_at: state.lock.locked_at,
      },
    };
    const history = (state.lock.history || []).concat([prev]);
    state.lock = {
      method_id: novo.id,
      ig_dias: novo.ig_dias,
      reference_date: GAMethods.iso(today()),
      dpp: GAMethods.iso(novo.dpp),
      descricao: novo.descricao,
      locked_at: new Date().toISOString(),
      history,
    };
    saveState();
    closeRedefinirModal();
    render();
    toast('IG redefinida — histórico atualizado', 'success');
  }

  // ============ TIMELINE ============
  function renderTimeline(lista) {
    if (!lista) lista = calcularTodos();
    const body = $('timelineBody');
    const refSpan = $('timelineRef');
    const ref = dppDeReferencia(lista);

    if (!ref) {
      refSpan.className = 'iga-tl-ref';
      refSpan.textContent = '';
      body.innerHTML = '<div class="iga-results-hint">Preencha uma entrada e selecione um método (ou trave a IG) para gerar a timeline.</div>';
      return;
    }

    // Header indicator
    if (ref.source === 'lock') {
      refSpan.className = 'iga-tl-ref locked';
      refSpan.textContent = `🔒 ${Biometria.formatarIG(ref.ig_dias, 'curto')} · DPP ${formatDateBR(ref.date)}`;
    } else {
      refSpan.className = 'iga-tl-ref preview';
      refSpan.textContent = `👁 preview: ${Biometria.formatarIG(ref.ig_dias, 'curto')} · DPP ${formatDateBR(ref.date)}`;
    }

    const tl = Timeline.gerarTimeline(ref.date, today());
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
      const dateStr = formatDateBR(ev.date);
      const dateCell = ev.window
        ? `${formatDateBR(ev.window.start)}<span class="range-sep">–</span>${formatDateBR(ev.window.end)}`
        : dateStr;
      const semCell = formatSemanas(ev);
      row.innerHTML = `
        <div class="iga-tl-dot"></div>
        <div class="iga-tl-label">${ev.label}</div>
        <div class="iga-tl-sem">${semCell}</div>
        <div class="iga-tl-date">${dateCell}</div>
        <div class="iga-tl-status ${ev.status}">${labelStatus(ev.status, ev.dias_ate)}</div>
      `;
      body.appendChild(row);
    });
  }
  function formatSemanas(ev) {
    if (ev.window_offset) {
      const a = Math.round(ev.window_offset.start / 7);
      const b = Math.round(ev.window_offset.end / 7);
      if (a !== b) return `${a}–${b} sem`;
      return `${a} sem`;
    }
    const w = Math.round(ev.offset_dias / 7);
    return `${w} sem`;
  }
  function labelStatus(s, dias) {
    if (s === 'current') return 'agora';
    if (s === 'past') return `há ${Math.abs(dias)}d`;
    if (s === 'upcoming') return `em ${dias}d`;
    if (s === 'overdue') return 'atrasado';
    return s;
  }

  // ============ PESO FETAL ============
  function renderPesoControls() {
    const sel = $('pesoFormula');
    sel.innerHTML = Biometria.CATALOGO_PESO.map((f) =>
      `<option value="${f.id}" ${state.peso.formula === f.id ? 'selected' : ''}>${f.nome}</option>`
    ).join('');
    sel.addEventListener('change', (e) => {
      state.peso.formula = e.target.value;
      saveState();
      renderPeso();
    });

    const grid = $('pesoInputs');
    const params = ['dbp', 'hc', 'ac', 'fl'];
    const labels = { dbp: 'DBP (mm)', hc: 'HC (mm)', ac: 'AC (mm)', fl: 'FL (mm)' };
    grid.innerHTML = params.map((p) => `
      <div class="iga-peso-cell" data-peso-param="${p}">
        <label class="form-label">${labels[p]}</label>
        <input type="number" class="form-input" step="0.1" min="0" value="${state.peso[p] || ''}" data-peso-k="${p}">
      </div>
    `).join('');

    grid.querySelectorAll('[data-peso-k]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        state.peso[e.target.dataset.pesoK] = e.target.value;
        saveState();
        renderPeso();
      });
    });
  }

  function renderPeso() {
    const f = Biometria.CATALOGO_PESO.find((x) => x.id === state.peso.formula);
    if (!f) return;
    // mostra/esconde campos baseado na fórmula
    document.querySelectorAll('[data-peso-param]').forEach((el) => {
      el.classList.toggle('hidden', !f.parametros.includes(el.dataset.pesoParam));
    });
    // calcula se todos os parametros tem valor
    const args = f.parametros.map((p) => Number(state.peso[p]));
    const ok = args.every((v) => v > 0 && !isNaN(v));
    const box = $('pesoResultado');
    if (!ok) {
      box.className = 'iga-peso-resultado';
      box.innerHTML = `Preencha: <strong>${f.parametros.map((p) => p.toUpperCase()).join(', ')}</strong> para estimar o peso.`;
      return;
    }
    const peso = f.fn(...args);
    // Percentil se IG travada
    let percentil = '';
    if (state.lock) {
      const igSem = state.lock.ig_dias / 7;
      const p = Biometria.percentilPesoHadlock(peso, igSem);
      percentil = `
        <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">
          Percentil Hadlock: <strong style="color:var(--text);">p${p.percentil.toFixed(0)}</strong>
          (Z = ${p.z} · p50 esperado ${p.p50_esperado}g · IG ${igSem.toFixed(1)}sem)
        </div>
      `;
    }
    box.className = 'iga-peso-resultado ok';
    box.innerHTML = `
      <span class="valor">${peso} g</span>
      <div style="font-size:11px; color:var(--text-dim);">${f.nome}</div>
      ${percentil}
    `;
  }

  // ============ BIND GLOBAL ============
  function bindGlobal() {
    $('btnAddUS').addEventListener('click', addUS);
    $('btnLimpar').addEventListener('click', clearState);
    $('btnDefinirIG').addEventListener('click', onDefinirIG);
    $('btnRedefinir').addEventListener('click', () => {
      if (!state.selected_method) {
        toast('Selecione um método na tabela para redefinir', 'warning');
        return;
      }
      const lista = calcularListaAtual();
      const sel = lista.find((r) => r.id === state.selected_method);
      if (!sel) return;
      openRedefinirModal(sel);
    });
    $('modalCancelar').addEventListener('click', closeRedefinirModal);
    $('modalConfirmar').addEventListener('click', confirmarRedefinir);
    $('btnDestravar').addEventListener('click', openDestravarModal);
    $('modalDestravarCancelar').addEventListener('click', closeDestravarModal);
    $('modalDestravarConfirmar').addEventListener('click', confirmarDestravar);
  }

  // ============ INIT ============
  function init() {
    renderHoje();
    hydrateDateInputs();
    bindDateInputs();
    renderUSList();
    renderBiometriaInputs();
    renderPesoControls();
    bindGlobal();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============ SERVICE WORKER ============
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .catch((e) => console.warn('SW register failed:', e));
    });
  }
})();
