/**
 * timeline.js — linha do tempo de eventos gestacionais derivada da DPP.
 *
 * Função pura: (dpp, hoje) -> [{ id, label, target_ga_dias, target_ga_sd,
 *    date, window?: {start,end}, status: 'past'|'current'|'upcoming'|'overdue',
 *    trimestre, tags }]
 *
 * Status:
 *   - past: já passou (mais de 2 dias antes de hoje)
 *   - current: janela em aberto em torno de hoje (±3 dias do pontual, ou dentro da janela)
 *   - upcoming: no futuro
 *   - overdue: já era para ter acontecido e não há janela futura
 */
(function (root) {
  'use strict';

  const MS_DIA = 24 * 60 * 60 * 1000;
  const DIAS_280 = 280;

  function addDias(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    return x;
  }
  function difDias(a, b) {
    const ma = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const mb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((ma - mb) / MS_DIA);
  }

  /**
   * Catálogo de eventos da gestação — ordenado por IG alvo.
   * offset_dias é medido a partir da DUM (= DPP - 280).
   * Se tem window_offset, o evento é uma FAIXA, não ponto.
   */
  const EVENTOS = [
    { id: 'dum', label: 'DUM', offset_dias: 0, trimestre: 1, tags: ['referencia'] },
    { id: 'ovulacao', label: 'Ovulação', offset_dias: 14, trimestre: 1, tags: ['referencia'] },
    { id: 'us_viabilidade', label: 'US de viabilidade',
      offset_dias: 35, window: [35, 56], trimestre: 1, tags: ['exame'] },
    { id: 'us_inicial', label: 'US inicial (início do pré-natal)',
      offset_dias: 56, window: [56, 70], trimestre: 1, tags: ['exame', 'pré-natal'] },
    { id: 'morfo_1t', label: 'Morfológico de 1º trimestre',
      offset_dias: 84, window: [84, 91], trimestre: 1, tags: ['exame', 'rastreio'] },
    { id: 'morfo_1t_limite', label: 'Morfológico de 1º trimestre (limite)',
      offset_dias: 84, window: [77, 98], trimestre: 1, tags: ['exame', 'janela extendida'] },
    { id: 'sexo', label: 'Definição do sexo',
      offset_dias: 112, trimestre: 2, tags: ['marco'] },
    { id: 'morfo_2t', label: 'Morfológico de 2º trimestre',
      offset_dias: 140, window: [140, 168], trimestre: 2, tags: ['exame', 'rastreio'] },
    { id: 'ecocardio', label: 'Ecocardiografia fetal',
      offset_dias: 196, trimestre: 3, tags: ['exame'] },
    { id: 'doppler_3d', label: 'Doppler / 3D',
      offset_dias: 196, window: [196, 224], trimestre: 3, tags: ['exame'] },
    { id: 'morfo_3t', label: 'Morfológico de 3º trimestre',
      offset_dias: 245, window: [245, 259], trimestre: 3, tags: ['exame', 'rastreio'] },
    { id: 'maturidade', label: 'Avaliação de maturidade',
      offset_dias: 259, trimestre: 3, tags: ['exame'] },
    { id: 'dpp', label: 'Data provável do parto',
      offset_dias: 280, trimestre: 3, tags: ['marco'] },
    { id: 'pos_termo', label: 'Pós-termo (42 semanas)',
      offset_dias: 294, trimestre: 3, tags: ['alerta'] },
  ];

  /** Classifica status do evento vs hoje. */
  function statusDe(eventDate, windowStart, windowEnd, hoje) {
    const hj = difDias(hoje, eventDate); // dias além do ponto principal
    const fimJanela = windowEnd ? difDias(hoje, windowEnd) : hj;
    const inicio = windowStart ? difDias(hoje, windowStart) : hj;

    // Dentro da janela (faixa)?
    if (windowStart && windowEnd) {
      if (inicio < 0) return 'upcoming';
      if (fimJanela > 0) {
        // Já passou do fim
        return 'past';
      }
      return 'current';
    }

    // Evento pontual — current se dentro de ±3 dias
    if (Math.abs(hj) <= 3) return 'current';
    if (hj > 3) return 'past';
    return 'upcoming';
  }

  /**
   * Gera a timeline.
   * @param {Date} dpp - data provável do parto travada
   * @param {Date} hoje - data atual de referência
   * @param {Array} eventosCustom - opcional: lista de eventos customizada (default: EVENTOS)
   * @returns array de eventos ordenados por data
   */
  function gerarTimeline(dpp, hoje, eventosCustom) {
    if (!(dpp instanceof Date) || isNaN(dpp)) return [];
    const dum = addDias(dpp, -DIAS_280);
    const today = hoje || new Date();
    const eventos = (Array.isArray(eventosCustom) && eventosCustom.length) ? eventosCustom : EVENTOS;

    return eventos.map((ev) => {
      const date = addDias(dum, ev.offset_dias);
      const windowStart = ev.window ? addDias(dum, ev.window[0]) : null;
      const windowEnd = ev.window ? addDias(dum, ev.window[1]) : null;
      const status = statusDe(date, windowStart, windowEnd, today);
      const igAlvo = ev.offset_dias;
      const sem = Math.floor(igAlvo / 7);
      const dias = igAlvo - sem * 7;
      return {
        id: ev.id,
        label: ev.label,
        date,
        window: ev.window ? { start: windowStart, end: windowEnd } : null,
        window_offset: ev.window ? { start: ev.window[0], end: ev.window[1] } : null,
        offset_dias: ev.offset_dias,
        target_ga_dias: igAlvo,
        target_ga_sd: `${sem}+${dias}`,
        trimestre: ev.trimestre,
        tags: ev.tags,
        cor: ev.cor || null,
        opacidade: (typeof ev.opacidade === 'number') ? ev.opacidade : 100,
        status,
        dias_ate: difDias(date, today), // + = futuro, - = passou
      };
    });
  }

  const api = { gerarTimeline, EVENTOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Timeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
