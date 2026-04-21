# Páginas privadas

Esta pasta contém páginas acessíveis **só por URL direto** — não há links públicos para elas, e o `robots.txt` da raiz impede indexação por buscadores.

## Criar uma nova página privada

1. **Gerar um token aleatório** (≥ 8 caracteres hex):
   ```bash
   openssl rand -hex 8
   # ou no navegador (console F12):
   # crypto.randomUUID().slice(0, 12)
   ```

2. **Criar a pasta** com esse nome dentro de `priv/`:
   ```
   priv/<token>/index.html
   ```

3. **Editar o `index.html`** com o conteúdo.

4. **Commit + push.** Cloudflare Pages faz o deploy automaticamente.

5. **URL resultante:** `https://<seu-dominio>/priv/<token>/`

## Tabela de links (mantenha local, fora do repo público)

Esta tabela NÃO deve ser versionada com nomes reais de pacientes.
Para controle pessoal, mantenha em gerenciador de senhas ou arquivo local.

| Token | Finalidade | Criado em | Expira |
|---|---|---|---|
| `80f5ca9324d2ffe9` | Template exemplo | 2026-04-21 | — |
| `300cd89b20ad6568` | Dashboard completo (todos os tools) | 2026-04-21 | — |

## Invalidar um link

Para revogar acesso: renomeie ou delete a pasta do token e dê push.
URL antigo passa a responder 404.

## Importante

- **Nunca linke** uma página privada do hub ou de páginas públicas (o referrer pode vazar).
- **Token curto (< 8 chars) é força-bruteável** — use no mínimo 8 hex.
- **Compartilhamento de link é impossível de rastrear** — quem recebeu pode repassar. Se precisar auditoria/limite, use Cloudflare Access (§3 da conversa).
