/**
 * biometria.js — fórmulas de biometria fetal (port do VBA Pregnancy2023.xlsm)
 *
 * Duas famílias de funções:
 *   1) biometriaParaIG(medida_mm) -> { days, reference, valid_range }
 *   2) igParaBiometria(ig_semanas) -> { mean_mm, sd, percentis }
 *
 * Unidades canônicas: mm (entrada) e dias (IG saída).
 * Arredondamento: usa Math.round (half-away-from-zero) — difere do VBA (banker's).
 *   Divergência máxima observada: ±1 dia em casos de borda. Aceitável.
 *
 * Todas as fórmulas vêm diretamente do módulo VBA original, com correção do
 * bug `IGCCI` vs `IGCCNI` (S16 da planilha Start — confirmado 2026-04-17).
 */
(function (root) {
  'use strict';

  // ---------- Helpers ----------
  const ln = Math.log;
  const exp = Math.exp;
  const sqrt = Math.sqrt;
  const round = Math.round;

  /** Converte dias de IG em "W+D" ou "W sem e D dias". */
  function formatarIG(dias, estilo) {
    if (dias == null || isNaN(dias)) return '';
    const d = Math.trunc(dias);
    const sem = Math.floor(d / 7);
    const resto = d - sem * 7;
    if (estilo === 'curto' || estilo === 1) {
      return `${sem}+${resto}`;
    }
    // estilo 'longo' (default)
    let out = `${sem} sem`;
    if (resto > 0) {
      out += resto === 1 ? ` e ${resto} dia` : ` e ${resto} dias`;
    }
    return out;
  }

  /** Z-score a partir de percentil (usa inversa normal aproximada - Acklam). */
  function zDePercentil(p) {
    if (p <= 0 || p >= 100) return NaN;
    const q = p / 100;
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687,
               138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866,
               66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838,
               -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996,
               3.754408661907416];
    const plow = 0.02425, phigh = 1 - plow;
    let x;
    if (q < plow) {
      const qq = sqrt(-2 * ln(q));
      x = (((((c[0]*qq+c[1])*qq+c[2])*qq+c[3])*qq+c[4])*qq+c[5]) /
          ((((d[0]*qq+d[1])*qq+d[2])*qq+d[3])*qq+1);
    } else if (q <= phigh) {
      const qq = q - 0.5;
      const r = qq * qq;
      x = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*qq /
          (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      const qq = sqrt(-2 * ln(1 - q));
      x = -(((((c[0]*qq+c[1])*qq+c[2])*qq+c[3])*qq+c[4])*qq+c[5]) /
            ((((d[0]*qq+d[1])*qq+d[2])*qq+d[3])*qq+1);
    }
    return x;
  }

  /** Percentil a partir de Z-score (CDF normal - Abramowitz & Stegun). */
  function percentilDeZ(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 +
            t * (-1.821256 + t * 1.330274))));
    if (z > 0) p = 1 - p;
    return p * 100;
  }

  // ---------- Biometria -> IG (retorna dias) ----------

  /**
   * DSG — Diâmetro do saco gestacional (mm) -> IG em dias.
   * Bagratee 2009 (Ultrasound Obstet Gynecol 34:503-509).
   * Faixa de validade: ~4-11 semanas (DSG 2-45 mm).
   */
  function igDeDSG(mm) {
    const d = ((mm + 31.183) / 7.385) * 7;
    return round(d);
  }

  /**
   * CCN Robinson 1973 (mm) -> IG em dias.
   * Faixa: 6-14 semanas (CCN 6-84 mm).
   */
  function igDeCCN_Robinson(mm) {
    const d = 8.052 * sqrt(mm * 1.037) + 23.73;
    return round(d);
  }

  /**
   * CCN Intergrowth-21st (mm) -> IG em dias.
   * Papageorghiou et al. Ultrasound Obstet Gynecol 2014.
   * Faixa: 9+0 a 14+0 semanas (CCN ~20-84 mm).
   */
  function igDeCCN_Intergrowth(mm) {
    const d = 40.9041 + 3.21585 * sqrt(mm) + 0.348956 * mm;
    return round(d);
  }

  /**
   * CCN Hadlock 1992 (mm) -> IG em dias.
   * Radiology 182:501-505.
   * Faixa: 5-18 semanas.
   */
  function igDeCCN_Hadlock(mm) {
    const x = mm / 10; // cm
    const v = 1.684969 + 0.315646 * x - 0.049306 * x * x
              + 0.004057 * x * x * x - 0.000120456 * x * x * x * x;
    return round(exp(v) * 7);
  }

  /**
   * CC — Circunferência cefálica Intergrowth-21st (mm) -> IG em dias.
   * Papageorghiou 2014. Faixa: 14-40 semanas.
   */
  function igDeCC_Intergrowth(mm) {
    const d = exp(0.0597 * ln(mm) * ln(mm)
                  + 6.409e-9 * mm * mm * mm + 3.3258);
    return round(d);
  }

  /**
   * DBP — Diâmetro biparietal Hadlock 1984 (mm) -> IG em dias.
   * Radiology 152:497-501. Faixa: 14-40 semanas.
   */
  function igDeDBP_Hadlock(mm) {
    const x = mm / 10;
    const semanas = 9.54 + 1.482 * x + 0.1676 * x * x;
    return round(semanas * 7);
  }

  /**
   * CF — Comprimento do fêmur Hadlock 1984 (mm) -> IG em dias.
   */
  function igDeCF_Hadlock(mm) {
    const x = mm / 10;
    const semanas = 10.35 + 2.46 * x + 0.17 * x * x;
    return round(semanas * 7);
  }

  /**
   * TCD — Diâmetro transcerebelar (mm) -> IG em dias.
   * Chavez et al. Am J Obstet Gynecol 2003.
   * Faixa: 12+ semanas.
   */
  function igDeTCD(mm) {
    const x = mm / 10;
    const semanas = 8.119 + 4.244 * x + 1.113 * x * x - 0.169 * x * x * x;
    return round(semanas * 7);
  }

  /**
   * CC + CF combinados Intergrowth-21st -> IG em dias.
   * Papageorghiou 2014.
   */
  function igDeCC_CF(cc_mm, cf_mm) {
    const d = exp(0.03243 * ln(cc_mm) * ln(cc_mm)
                  + 0.001644 * cf_mm * ln(cc_mm) + 3.813);
    return round(d);
  }

  // ---------- IG -> Biometria (retorna mm + percentis) ----------

  function _comPercentis(media, sd, arred) {
    const dec = arred == null ? 1 : arred;
    const f = (v) => Number(v.toFixed(dec));
    return {
      media: f(media),
      sd: f(sd),
      p1: f(media - 2.326 * sd),
      p3: f(media - 1.88 * sd),
      p5: f(media - 1.645 * sd),
      p10: f(media - 0.675 * sd),
      p50: f(media),
      p90: f(media + 0.675 * sd),
      p95: f(media + 1.645 * sd),
      p97: f(media + 1.88 * sd),
      p99: f(media + 2.326 * sd),
    };
  }

  /** DBP esperado para IG em semanas (Intergrowth-21st). */
  function dbpParaIG(ig) {
    const media = 5.608777 + 0.1583693 * ig * ig - 0.0025642 * ig * ig * ig;
    const sd = exp(0.101242 + 0.00150557 * ig * ig * ig
                   - 0.000771535 * ig * ig * ig * ln(ig)
                   + 0.0000999638 * ig * ig * ig * ln(ig) * ln(ig));
    return _comPercentis(media, sd);
  }

  /** DOF (diâmetro occipitofrontal) esperado para IG (Intergrowth-21st). */
  function dofParaIG(ig) {
    const media = -12.4097 + 0.626342 * ig * ig - 0.148075 * ig * ig * ln(ig);
    const sd = exp(-0.880034 + 0.0631165 * ig * ig
                   - 0.0317136 * ig * ig * ln(ig)
                   + 0.00408302 * ig * ig * ln(ig) * ln(ig));
    return _comPercentis(media, sd);
  }

  /** CC esperada para IG (Intergrowth-21st). */
  function ccParaIG(ig) {
    const media = -28.2849 + 1.69267 * ig * ig - 0.397485 * ig * ig * ln(ig);
    const sd = 1.98735 + 0.0136772 * ig * ig * ig
               - 0.00726264 * ig * ig * ig * ln(ig)
               + 0.000976253 * ig * ig * ig * ln(ig) * ln(ig);
    return _comPercentis(media, sd);
  }

  /** TCD esperado para IG (Intergrowth-21st). */
  function tcdParaIG(ig) {
    const media = 6.9519 + 0.03327 * ig * ig;
    const sd = -0.5177 + 0.0772 * ig;
    return _comPercentis(media, sd);
  }

  /** CF esperado para IG (Intergrowth-21st). */
  function cfParaIG(ig) {
    const media = -39.9616 + 4.32298 * ig - 0.0380156 * ig * ig;
    const sd = exp(0.605843 - 42.0014 / (ig * ig) + 9.17972e-6 * ig * ig * ig);
    return _comPercentis(media, sd);
  }

  /** CA esperada para IG. tabela: 'intergrowth' (default) ou 'salomon'. */
  function caParaIG(ig, tabela) {
    let media, sd;
    if (tabela === 'salomon') {
      media = 42.7794 - 2.7882 * ig + 0.5715 * ig * ig - 0.008 * ig * ig * ig;
      sd = -2.3658 + 0.6459 * ig;
    } else {
      media = -81.3243 + 11.6772 * ig - 0.000561865 * ig * ig * ig;
      sd = -4.36302 + 0.121445 * ig * ig
           - 0.0130256 * ig * ig * ig
           + 0.00282143 * ig * ig * ig * ln(ig);
    }
    return _comPercentis(media, sd);
  }

  /** Úmero esperado para IG (Chitty 2002). */
  function umeroParaIG(ig) {
    const media = 11.459 * ig - 2.2362 * ig * ln(ig) - 63.704;
    const sd = 0.040292 * ig + 1.3464;
    return _comPercentis(media, sd);
  }

  /** DSG esperado para IG (Bagratee 2009). */
  function dsgParaIG(ig) {
    const w = ig;
    const media = -31.183 + 7.385 * w;
    const sd = 0.997 + 0.537 * w;
    return _comPercentis(media, sd, 0);
  }

  // ---------- Peso fetal estimado ----------

  /**
   * Hadlock 3C — HC + AC + FL (mm) -> peso em gramas.
   * Hadlock 1985. **Fórmula default do sistema.**
   * log10(BW) = 1.326 - 0.00326·AC·FL + 0.0107·HC + 0.0438·AC + 0.158·FL (cm)
   * Em mm os coeficientes vêm divididos por 10 (termos lineares) e 100 (AC·FL).
   */
  function pesoHadlock_HC_AC_FL(hc, ac, fl) {
    const log10 = Math.log10 || ((x) => ln(x) / ln(10));
    const p = 1.326
              - 0.0000326 * ac * fl
              + 0.00107 * hc
              + 0.00438 * ac
              + 0.0158 * fl;
    const peso = Math.pow(10, p);
    return round(peso);
  }

  /**
   * Hadlock 4C — DBP + HC + AC + FL (mm) -> peso em gramas.
   * Hadlock 1985.
   */
  function pesoHadlock_DBP_HC_AC_FL(dbp, hc, ac, fl) {
    const p = 1.3596
              - 0.0000386 * ac * fl
              + 0.00064 * hc
              + 0.0000061 * dbp * ac
              + 0.00424 * ac
              + 0.0174 * fl;
    return round(Math.pow(10, p));
  }

  /**
   * Hadlock 2C — AC + FL (mm) -> peso em gramas.
   * Hadlock 1985.
   */
  function pesoHadlock_AC_FL(ac, fl) {
    // Coeficientes em mm: paper usa cm. AC/FL lineares ÷10, AC·FL ÷100.
    const p = 1.304
              + 0.005281 * ac
              + 0.01938 * fl
              - 0.00004 * ac * fl;
    return round(Math.pow(10, p));
  }

  /**
   * Intergrowth-21st — HC + AC (mm) -> peso em gramas.
   * Stirnemann 2017 (Ultrasound Obstet Gynecol 49:478-486).
   */
  function pesoIntergrowth_HC_AC(hc, ac) {
    const acK = ac / 1000;
    const hcK = hc / 1000;
    const peso = exp(5.08482
                     - 54.06633 * Math.pow(acK, 3)
                     - 95.80076 * Math.pow(acK, 3) * ln(acK)
                     + 3.13637 * hcK);
    return round(peso);
  }

  /**
   * Peso esperado para IG (Intergrowth-21st p50, Stirnemann 2017).
   * Sem biometria — só IG em semanas.
   */
  function pesoEsperadoParaIG(ig) {
    const p50 = 3459.382
                + 156.069 * (ig - 40)
                - 11.784 * Math.pow(ig - 40, 2)
                - 0.674 * Math.pow(ig - 40, 3);
    return round(p50);
  }

  /**
   * Percentil de peso observado dado IG (Hadlock 1991).
   * Radiology 181:129-133. SD = 13% da média.
   */
  function percentilPesoHadlock(pesoG, ig) {
    const p50 = exp(0.578 + 0.332 * ig - 0.00354 * ig * ig);
    const sd = 0.13 * p50;
    const z = (pesoG - p50) / sd;
    return {
      p50_esperado: round(p50),
      z: Number(z.toFixed(2)),
      percentil: Number(percentilDeZ(z).toFixed(1)),
    };
  }

  // ---------- Catálogo unificado de fórmulas (para UI) ----------

  /**
   * Cada entrada descreve uma fórmula biometria->IG com metadados para a UI.
   * faixa_validade em semanas.
   */
  const CATALOGO = [
    {
      id: 'dsg',
      parametro: 'DSG',
      nome: 'Diâmetro do saco gestacional',
      formulas: [{
        id: 'dsg_bagratee',
        nome: 'Bagratee 2009',
        referencia: 'Bagratee JS et al. Ultrasound Obstet Gynecol 2009; 34:503-509',
        faixa: [4, 11],
        fn: igDeDSG,
      }],
    },
    {
      id: 'ccn',
      parametro: 'CCN',
      nome: 'Comprimento crânio-caudal',
      default_id: 'ccn_robinson',
      formulas: [
        {
          id: 'ccn_robinson',
          nome: 'Robinson 1973',
          referencia: 'Robinson HP. BMJ 1973; 4:28-31',
          faixa: [6, 14],
          fn: igDeCCN_Robinson,
        },
        {
          id: 'ccn_hadlock',
          nome: 'Hadlock 1992',
          referencia: 'Hadlock FP et al. Radiology 1992; 182:501-505',
          faixa: [5, 18],
          fn: igDeCCN_Hadlock,
        },
        {
          id: 'ccn_intergrowth',
          nome: 'Intergrowth-21st',
          referencia: 'Papageorghiou AT et al. Ultrasound Obstet Gynecol 2014',
          faixa: [9, 14],
          fn: igDeCCN_Intergrowth,
        },
      ],
    },
    {
      id: 'dbp',
      parametro: 'DBP',
      nome: 'Diâmetro biparietal',
      formulas: [{
        id: 'dbp_hadlock',
        nome: 'Hadlock 1984',
        referencia: 'Hadlock FP et al. Radiology 1984; 152:497-501',
        faixa: [12, 40],
        fn: igDeDBP_Hadlock,
      }],
    },
    {
      id: 'cf',
      parametro: 'CF',
      nome: 'Comprimento do fêmur',
      formulas: [{
        id: 'cf_hadlock',
        nome: 'Hadlock 1984',
        referencia: 'Hadlock FP et al. Radiology 1984; 152:497-501',
        faixa: [12, 40],
        fn: igDeCF_Hadlock,
      }],
    },
    {
      id: 'tcd',
      parametro: 'TCD',
      nome: 'Diâmetro transcerebelar',
      formulas: [{
        id: 'tcd_chavez',
        nome: 'Chavez 2003',
        referencia: 'Chavez MR et al. Am J Obstet Gynecol 2003; 189:1021-1025',
        faixa: [12, 40],
        fn: igDeTCD,
      }],
    },
    {
      id: 'cc',
      parametro: 'CC',
      nome: 'Circunferência cefálica',
      formulas: [{
        id: 'cc_intergrowth',
        nome: 'Intergrowth-21st',
        referencia: 'Papageorghiou AT et al. Ultrasound Obstet Gynecol 2014',
        faixa: [14, 40],
        fn: igDeCC_Intergrowth,
      }],
    },
    {
      id: 'cc_cf',
      parametro: 'CC + CF',
      nome: 'Circunferência cefálica + fêmur (combinado)',
      duas_medidas: true,
      formulas: [{
        id: 'cc_cf_intergrowth',
        nome: 'Intergrowth-21st (CC+FL)',
        referencia: 'Papageorghiou AT et al. Ultrasound Obstet Gynecol 2014',
        faixa: [15, 40],
        fn: igDeCC_CF,
      }],
    },
  ];

  const CATALOGO_PESO = [
    {
      id: 'hadlock_3c',
      nome: 'Hadlock (HC + AC + FL)',
      referencia: 'Hadlock FP et al. Am J Obstet Gynecol 1985; 151:333-337',
      parametros: ['hc', 'ac', 'fl'],
      fn: pesoHadlock_HC_AC_FL,
      default: true,
    },
    {
      id: 'hadlock_4c',
      nome: 'Hadlock (DBP + HC + AC + FL)',
      referencia: 'Hadlock FP et al. Am J Obstet Gynecol 1985; 151:333-337',
      parametros: ['dbp', 'hc', 'ac', 'fl'],
      fn: pesoHadlock_DBP_HC_AC_FL,
    },
    {
      id: 'hadlock_2c',
      nome: 'Hadlock (AC + FL)',
      referencia: 'Hadlock FP et al. Am J Obstet Gynecol 1985; 151:333-337',
      parametros: ['ac', 'fl'],
      fn: pesoHadlock_AC_FL,
    },
    {
      id: 'intergrowth',
      nome: 'Intergrowth-21st (HC + AC)',
      referencia: 'Stirnemann J et al. Ultrasound Obstet Gynecol 2017; 49:478-486',
      parametros: ['hc', 'ac'],
      fn: pesoIntergrowth_HC_AC,
    },
  ];

  // ---------- Export ----------
  const api = {
    formatarIG,
    zDePercentil,
    percentilDeZ,
    // biometria -> IG
    igDeDSG,
    igDeCCN_Robinson,
    igDeCCN_Intergrowth,
    igDeCCN_Hadlock,
    igDeCC_Intergrowth,
    igDeDBP_Hadlock,
    igDeCF_Hadlock,
    igDeTCD,
    igDeCC_CF,
    // IG -> biometria
    dbpParaIG,
    dofParaIG,
    ccParaIG,
    tcdParaIG,
    cfParaIG,
    caParaIG,
    umeroParaIG,
    dsgParaIG,
    // peso
    pesoHadlock_HC_AC_FL,
    pesoHadlock_DBP_HC_AC_FL,
    pesoHadlock_AC_FL,
    pesoIntergrowth_HC_AC,
    pesoEsperadoParaIG,
    percentilPesoHadlock,
    // catálogos
    CATALOGO,
    CATALOGO_PESO,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Biometria = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
