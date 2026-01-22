# 🤰 Calculadora de Idade Gestacional

**Portal de ferramentas para gestantes - Dr. Rafael Peters**

---

## 📋 Sobre o Projeto

Sistema web modular para cálculo de idade gestacional, desenvolvido com arquitetura expansível para futuras funcionalidades.

### Funcionalidades Atuais

- ✅ Cálculo por **DUM** (Data da Última Menstruação)
- ✅ Cálculo por **DPP** (Data Provável do Parto)  
- ✅ Cálculo por **Ultrassom** (data + semanas + dias)
- ✅ **Slider interativo** com semanas e dias
- ✅ Conversão precisa para **meses comerciais** (280 dias ÷ 9)
- ✅ **Linha do tempo visual** com trimestres e meses
- ✅ Lista de **exames recomendados** por período
- ✅ **Editor de exames** personalizável
- ✅ Design **responsivo** e moderno

---

## 🗂️ Estrutura de Arquivos

```
site-gestacional/
│
├── index.html                      # Página principal
│
├── assets/
│   ├── css/
│   │   ├── base.css                # Variáveis, reset, tipografia
│   │   ├── components.css          # Cards, botões, inputs
│   │   └── calculadora.css         # Estilos específicos
│   │
│   ├── js/
│   │   ├── core/
│   │   │   ├── calculos.js         # ⭐ Funções matemáticas
│   │   │   └── formatacao.js       # Formatação de textos
│   │   │
│   │   └── pages/
│   │       └── ig-calculator.js    # Lógica da página
│   │
│   └── data/
│       ├── exames.json             # ⭐ Dados editáveis de exames
│       └── meses.json              # Tabela de conversão
│
├── calculadoras/                    # [Futuro] Outras calculadoras
├── admin/                           # [Futuro] Área administrativa
└── docs/                            # Documentação
```

---

## 🧮 Fórmulas de Cálculo

### Entradas → DPP

| Método | Fórmula |
|--------|---------|
| DUM | `DPP = DUM + 280 dias` |
| DPP | `DPP = data informada` |
| Ultrassom | `DPP = data_exame + 280 - (semanas × 7 + dias)` |

### Idade Gestacional Atual

```javascript
diasGestacao = 280 - (DPP - hoje)
semanas = Math.floor(diasGestacao / 7)
dias = diasGestacao % 7
```

### Tabela de Conversão: Meses Comerciais

| Mês | Dias Acumulados | Semanas (início-fim) |
|-----|-----------------|----------------------|
| 1º  | 31              | 0s+0d a 4s+3d        |
| 2º  | 62              | 4s+3d a 8s+6d        |
| 3º  | 93              | 8s+6d a 13s+2d       |
| 4º  | 124             | 13s+2d a 17s+5d      |
| 5º  | 155             | 17s+5d a 22s+1d      |
| 6º  | 186             | 22s+1d a 26s+4d      |
| 7º  | 217             | 26s+4d a 31s+0d      |
| 8º  | 248             | 31s+0d a 35s+3d      |
| 9º  | 280             | 35s+3d a 40s+0d      |

---

## ⚙️ Como Usar

### 1. Hospedagem Local

Basta abrir `index.html` no navegador. Os arquivos JSON são carregados via fetch.

> **Nota:** Para funcionar localmente, alguns navegadores requerem um servidor local devido a políticas de CORS.

### 2. Servidor Local Rápido

```bash
# Com Python 3
python -m http.server 8000

# Ou com Node.js
npx serve
```

Acesse: `http://localhost:8000`

### 3. Hospedagem em Produção

Suba todos os arquivos para qualquer hospedagem estática:
- GitHub Pages
- Netlify
- Vercel
- Servidor próprio

---

## ✏️ Personalizando Exames

### Opção 1: Via Interface
1. Clique em "Editar Exames"
2. Modifique os campos
3. Clique em "Salvar"

Os dados são salvos no `localStorage` do navegador.

### Opção 2: Editando o JSON

Edite `assets/data/exames.json`:

```json
{
  "18-22": {
    "titulo": "Semanas 18-22",
    "emoji": "❤️",
    "trimestre": 2,
    "exames": [
      { "nome": "Morfológico de 2º trimestre", "destaque": true },
      { "nome": "Ecocardiografia fetal" }
    ],
    "consultas": "Consulta pré-natal mensal",
    "observacao": "Período ideal para ver o sexo do bebê."
  }
}
```

---

## 🎨 Personalizando Cores

Edite as variáveis em `assets/css/base.css`:

```css
:root {
    --rosa: #EC4899;      /* 1º Trimestre */
    --roxo: #8B5CF6;      /* 2º Trimestre */
    --azul: #3B82F6;      /* 3º Trimestre */
    --bg-dark: #0f172a;   /* Fundo */
}
```

---

## 🔮 Expansões Futuras

- [ ] Calculadora de **Ganho de Peso**
- [ ] **Curvas de Percentis** fetais
- [ ] Calculadora de **Datas Importantes**
- [ ] **PWA** (funcionar offline)
- [ ] **Compartilhar** no WhatsApp
- [ ] Área **Admin** para gerenciar exames

---

## 📱 Compatibilidade

- ✅ Chrome, Firefox, Safari, Edge (versões modernas)
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Responsivo (mobile, tablet, desktop)

---

## 👨‍⚕️ Autor

**Dr. Rafael Peters**  
Especialista em Medicina Fetal e Ultrassonografia  
📸 [@drrafaelpeters](https://instagram.com/drrafaelpeters)

---

## 📄 Licença

Este projeto é de uso privado do Dr. Rafael Peters.  
Para uso comercial ou redistribuição, entre em contato.
