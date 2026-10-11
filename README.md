# Minha Carteira

App pessoal de investimentos: ações, FIIs, Tesouro Direto, CDB e cripto, com cotações atualizadas, proventos automáticos e rendimento líquido do CDB.

- Instala no celular (Android e iPhone) e abre sem internet.
- Login com a conta Google. Os lançamentos ficam no Firebase, e só a sua conta lê e grava os seus dados.
- **Este repositório não tem nenhum dado pessoal.** Aqui ficam só o código do app e o robô que busca dados públicos de mercado.
- Custo zero: GitHub Pages + GitHub Actions + Firebase (plano gratuito Spark).

## Como funciona

| Parte | O que faz |
|---|---|
| `index.html`, `style.css`, `src/` | o app (sem etapa de build: arquivos estáticos) |
| `src/calc.js` | todas as contas: preço médio, CDB com CDI diário e IR/IOF, Tesouro líquido, retorno com inflação, DY, yield on cost, relatório do IR |
| `src/store.js` | login Google e dados no Firestore (`users/{uid}/ops`), com cópia no aparelho |
| `src/mercado.js` | lê `dados/mercado.json` e busca cripto ao vivo na Binance |
| `robo/atualizar.mjs` | robô de dados públicos (roda no GitHub Actions) |
| `.github/workflows/dados.yml` | roda o robô e publica o site no GitHub Pages |
| `firestore.rules` | regras do Firestore: cada pessoa só acessa `users/{seu uid}` |

### Robô de dados (GitHub Actions)

- Dias úteis, a cada 30 min das 10h às 18h30: preços da B3 (brapi, lista pública sem token), cripto e USDT em reais (Binance), dólar (AwesomeAPI), avisos de rendimento de FIIs (FundosNET da B3).
- Todo dia às 7h: também CDI diário e IPCA (Banco Central), preços do Tesouro Direto (Tesouro Transparente) e proventos das empresas (B3).
- Se uma fonte falhar, fica o último valor publicado.
- Para buscar um ano de avisos de FIIs: **Actions → Dados de mercado e publicação → Run workflow** com `dias = 400`.

## Colocar no ar (uma vez)

1. **Firebase:** projeto novo → Authentication → Google → Ativar; em *Domínios autorizados*, adicionar `SEU-USUARIO.github.io`; Firestore em `southamerica-east1` (modo produção); colar `firestore.rules` em Firestore → Regras → Publicar; registrar um app da Web e copiar o `firebaseConfig` para `src/config.js`.
2. **GitHub:** repositório público → Settings → Pages → Source: **GitHub Actions**. Cada envio de código publica o app.
3. Abrir `https://SEU-USUARIO.github.io/carteira/`, entrar com Google e instalar (Android: Chrome → ⋮ → Instalar app; iPhone: Safari → Compartilhar → Adicionar à Tela de Início).

Sem `src/config.js` preenchido (ou com `#demo` no endereço), o app abre em **modo demonstração**, com dados de exemplo só no aparelho.

## Versão nova

Mude `VERSION` em `sw.js` e `VERSAO` em `src/main.js`. Quem estiver usando vê "Tem uma versão nova do app → Atualizar".
