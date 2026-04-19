/**
 * ga-methods.js — métodos de cálculo de idade gestacional por data.
 *
 * Unidades canônicas: dias (IG). Datas: Date do JS, interpretadas em local time
 * (evitamos UTC para não ter bug de fuso em datas clínicas).
 *
 * Cada método é uma função pura que retorna:
 *   { id, label, ig_dias, dpp, valid, motivo_invalido, descricao }
 */
(function (root) {
  'use strict';

  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const GESTACAO_DIAS = 280;

  /** Normaliza Date para meia-noite local (tira horas/min/seg). */
  function diaLocal(d) {
    if (!(d instanceof Date) || isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Diferença em dias entre duas datas (inteiro, arredondado). */
  function difDias(a, b) {
    const ma = diaLocal(a), mb = diaLocal(b);
    if (!ma || !mb) return NaN;
    return Math.round((ma - mb) / MS_POR_DIA);
  }

  /** Adiciona N dias a uma data (retorna nova Date em local time). */
  function adicionarDias(d, n) {
    const x = diaLocal(d);
    if (!x) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate() + n);
  }

  /** DPP derivada de IG atual em dias: DPP = hoje + (280 - ig_dias). */
  function dppDeIG(hoje, ig_dias) {
    return adicionarDias(hoje, GESTACAO_DIAS - ig_dias);
  }

  /** DUM derivada de DPP: DUM = DPP - 280. */
  function dumDeDPP(dpp) {
    return adicionarDias(dpp, -GESTACAO_DIAS);
  }

  /** Formata data ISO YYYY-MM-DD. */
  function iso(d) {
    const x = diaLocal(d);
    if (!x) return '';
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    const dd = String(x.getDate()).padStart(2, '0');
    return `${x.getFullYear()}-${mm}-${dd}`;
  }

  /** Parse ISO date string YYYY-MM-DD em Date local. */
  function parseISO(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  /**
   * Parser flexível de data. Aceita:
   *   "1/1/26", "23/3/2026", "23-3-26", "1.1.26"  (separadores / - . espaço)
   *   "230326" (ddmmyy), "23032026" (ddmmyyyy)
   *   "1/1", "23/3", "2303", "0101"               (sem ano → ano atual)
   * Retorna ISO YYYY-MM-DD ou null se inválido.
   */
  function parseFlexDate(str) {
    if (!str) return null;
    const raw = String(str).trim();
    if (!raw) return null;
    const anoAtual = new Date().getFullYear();
    let d, m, y;
    const digits = raw.replace(/\D/g, '');
    if (/^\d+$/.test(raw)) {
      if (digits.length === 4) {
        d = +digits.slice(0, 2); m = +digits.slice(2, 4); y = anoAtual;
      } else if (digits.length === 6) {
        d = +digits.slice(0, 2); m = +digits.slice(2, 4); y = 2000 + +digits.slice(4, 6);
      } else if (digits.length === 8) {
        d = +digits.slice(0, 2); m = +digits.slice(2, 4); y = +digits.slice(4, 8);
      } else return null;
    } else {
      const parts = raw.split(/[\/\-.\s]+/).filter(Boolean);
      if (parts.length === 2) {
        d = +parts[0]; m = +parts[1]; y = anoAtual;
      } else if (parts.length === 3) {
        const yStr = parts[2];
        if (yStr.length !== 2 && yStr.length !== 4) return null;
        d = +parts[0]; m = +parts[1]; y = +yStr;
        if (y < 100) y += 2000;
      } else return null;
    }
    if (!d || !m || !y) return null;
    if (d < 1 || d > 31 || m < 1 || m > 12) return null;
    if (y < 1900 || y > 2100) return null;
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  /** ISO YYYY-MM-DD → "d/m/aa" compacto. */
  function isoToShort(isoStr) {
    if (!isoStr) return '';
    const dt = parseISO(isoStr);
    if (!dt) return '';
    return `${dt.getDate()}/${dt.getMonth() + 1}/${String(dt.getFullYear()).slice(-2)}`;
  }

  // ---------- Métodos de IG ----------

  function invalido(id, label, motivo) {
    return { id, label, ig_dias: null, dpp: null, valid: false,
             motivo_invalido: motivo, descricao: null };
  }

  /** DUM: IG = hoje - DUM */
  function porDUM(hoje, dum) {
    if (!dum) return invalido('dum', 'DUM', 'Data da última menstruação não informada');
    const dias = difDias(hoje, dum);
    if (dias < 0) return invalido('dum', 'DUM', 'DUM no futuro');
    if (dias > 315) return invalido('dum', 'DUM', 'DUM muito antiga (>45sem)');
    return {
      id: 'dum', label: 'DUM',
      ig_dias: dias,
      dpp: adicionarDias(dum, GESTACAO_DIAS),
      valid: true,
      descricao: `baseado na DUM dia ${iso(dum)}`,
    };
  }

  /** Ovulação (presumida): IG = hoje - ovul + 14 */
  function porOvulacao(hoje, dataOvul) {
    if (!dataOvul) return invalido('ovulacao', 'Ovulação', 'Data não informada');
    const dias = difDias(hoje, dataOvul) + 14;
    if (dias < 14) return invalido('ovulacao', 'Ovulação', 'Data no futuro');
    return {
      id: 'ovulacao', label: 'Ovulação',
      ig_dias: dias,
      dpp: adicionarDias(dataOvul, GESTACAO_DIAS - 14),
      valid: true,
      descricao: `baseado na ovulação dia ${iso(dataOvul)}`,
    };
  }

  /** FIV 3 dias: IG = hoje - transfer + 14 + 3 */
  function porFIV3(hoje, dataTransfer) {
    if (!dataTransfer) return invalido('fiv3', 'FIV (3 dias)', 'Data de transferência não informada');
    const dias = difDias(hoje, dataTransfer) + 17;
    if (dias < 17) return invalido('fiv3', 'FIV (3 dias)', 'Data no futuro');
    return {
      id: 'fiv3', label: 'FIV (3 dias)',
      ig_dias: dias,
      dpp: adicionarDias(dataTransfer, GESTACAO_DIAS - 17),
      valid: true,
      descricao: `baseado em FIV (transfer D3) dia ${iso(dataTransfer)}`,
    };
  }

  /** FIV 5 dias: IG = hoje - transfer + 14 + 5 */
  function porFIV5(hoje, dataTransfer) {
    if (!dataTransfer) return invalido('fiv5', 'FIV (5 dias)', 'Data de transferência não informada');
    const dias = difDias(hoje, dataTransfer) + 19;
    if (dias < 19) return invalido('fiv5', 'FIV (5 dias)', 'Data no futuro');
    return {
      id: 'fiv5', label: 'FIV (5 dias)',
      ig_dias: dias,
      dpp: adicionarDias(dataTransfer, GESTACAO_DIAS - 19),
      valid: true,
      descricao: `baseado em FIV (transfer D5) dia ${iso(dataTransfer)}`,
    };
  }

  /** DPP conhecida: IG = hoje - DPP + 280 */
  function porDPP(hoje, dpp) {
    if (!dpp) return invalido('dpp', 'DPP', 'DPP não informada');
    const dias = difDias(hoje, dpp) + GESTACAO_DIAS;
    if (dias < 0 || dias > 315) return invalido('dpp', 'DPP', 'DPP fora de faixa');
    return {
      id: 'dpp', label: 'DPP',
      ig_dias: dias,
      dpp: diaLocal(dpp),
      valid: true,
      descricao: 'baseado na DPP informada',
    };
  }

  /** IG manual (semanas + dias) */
  function porIGManual(hoje, sem, dias) {
    const s = Number(sem), d = Number(dias);
    if (isNaN(s) || isNaN(d)) return invalido('manual', 'IG manual', 'Valores inválidos');
    if (s < 0 || s > 45 || d < 0 || d > 6) return invalido('manual', 'IG manual', 'Fora da faixa');
    const total = s * 7 + d;
    return {
      id: 'manual', label: 'IG manual',
      ig_dias: total,
      dpp: dppDeIG(hoje, total),
      valid: true,
      descricao: `baseado em cálculo manual (${s}+${d})`,
    };
  }

  /**
   * US anterior com IG conhecida no dia do exame.
   * IG_hoje = (hoje - data_us) + ig_no_dia_us
   */
  function porUSAnterior(hoje, dataExame, semExame, diasExame, rotulo) {
    if (!dataExame) return invalido('us', rotulo || 'US anterior', 'Data não informada');
    const s = Number(semExame), d = Number(diasExame);
    if (isNaN(s) || isNaN(d)) return invalido('us', rotulo || 'US anterior', 'IG no exame inválida');
    const igNoExame = s * 7 + d;
    const delta = difDias(hoje, dataExame);
    if (delta < 0) return invalido('us', rotulo || 'US anterior', 'Data do US no futuro');
    const total = delta + igNoExame;
    return {
      id: 'us_anterior', label: rotulo || 'US anterior',
      ig_dias: total,
      dpp: adicionarDias(dataExame, GESTACAO_DIAS - igNoExame),
      valid: true,
      descricao: `baseado em US de ${iso(dataExame)} com ${s}+${d}`,
    };
  }

  /**
   * US anterior baseado em uma MEDIDA biométrica retroativa.
   * Ex: paciente trouxe US de 10/12/24 com CCN 60mm. Sistema calcula IG
   * pelo CCN naquele dia, depois projeta para hoje.
   */
  function porUSAnteriorComMedida(hoje, dataExame, ig_dias_no_exame, desc) {
    if (!dataExame) return invalido('us_medida', 'US anterior (medida)', 'Data não informada');
    if (ig_dias_no_exame == null) return invalido('us_medida', 'US anterior (medida)', 'Medida inválida');
    const delta = difDias(hoje, dataExame);
    if (delta < 0) return invalido('us_medida', 'US anterior (medida)', 'Data no futuro');
    const total = delta + ig_dias_no_exame;
    return {
      id: 'us_medida', label: 'US anterior (medida)',
      ig_dias: total,
      dpp: adicionarDias(dataExame, GESTACAO_DIAS - ig_dias_no_exame),
      valid: true,
      descricao: desc || `baseado em medida de US de ${iso(dataExame)}`,
    };
  }

  /** IG projetada para uma data alvo, dado estado travado. */
  function igNaData(estado_lock, data_alvo) {
    if (!estado_lock || !estado_lock.dpp) return null;
    const delta = difDias(data_alvo, estado_lock.dpp);
    return GESTACAO_DIAS + delta; // dias de IG naquela data
  }

  // ---------- Export ----------
  const api = {
    GESTACAO_DIAS,
    diaLocal,
    difDias,
    adicionarDias,
    dppDeIG,
    dumDeDPP,
    iso,
    parseISO,
    parseFlexDate,
    isoToShort,
    // métodos
    porDUM,
    porOvulacao,
    porFIV3,
    porFIV5,
    porDPP,
    porIGManual,
    porUSAnterior,
    porUSAnteriorComMedida,
    // projeção
    igNaData,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GAMethods = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
