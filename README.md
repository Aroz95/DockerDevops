# Docker & DevOps da zero

Corso interattivo per principianti assoluti, pubblicato su GitHub Pages.
Il piano completo del corso è in `piano-corso-docker-devops.md` (sezioni 8-10 per l'architettura).

## Requisiti

- Node.js 22.12 o successivo (la versione usata dal deploy è in `.nvmrc`)
- npm

## Primo avvio

```bash
npm install        # installa le dipendenze e crea package-lock.json
npm run dev        # avvia il sito in locale su http://localhost:5173
```

**Importante:** dopo il primo `npm install` fai commit di `package-lock.json`.
Il workflow di deploy usa `npm ci`, che richiede quel file per installare sempre le stesse versioni.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Sito in locale con ricaricamento automatico |
| `npm run build` | Controllo dei tipi e build di produzione in `dist/` |
| `npm run preview` | Serve la build di `dist/` per provarla |
| `npm test` | Esegue i test una volta |
| `npm run test:watch` | Test in modalità continua |
| `npm run lint` | ESLint (include la regola "nessun testo fuori da i18n") |
| `npm run typecheck` | Solo controllo dei tipi TypeScript |
| `npm run format` | Formatta il codice con Prettier |

## Pubblicazione su GitHub Pages

1. Crea il repository su GitHub e fai push del progetto sul branch `main`.
2. Nel repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Ogni push su `main` esegue `.github/workflows/deploy.yml`: lint, tipi, test, build e pubblicazione.
   Le pull request vengono solo verificate, non pubblicate.

Il percorso base del sito (`/<nome-repository>/`) è calcolato dal workflow: non va configurato a mano.

## Struttura

```
src/
  main.tsx              punto di ingresso: carica impostazioni, avvia i18n, monta l'app
  App.tsx               provider + HashRouter
  routes/               pagine e AppRoutes (elenco delle rotte), paths.ts (indirizzi)
  components/
    layout/             AppShell, Header, Footer
    settings/           selettore lingua e tema
    mappa/              componenti della mappa del corso
    ui/                 componenti generici (Card, ButtonLink…)
  context/              SettingsProvider (lingua, tema)
  hooks/                useSettings, useDocumentTitle
  state/                logica pura: impostazioni, reducer, accesso a localStorage
  i18n/                 configurazione i18next e testi dell'interfaccia (locales/<lingua>/ui.json)
  content/              contenuti del corso: struttura (mondi.json) + testi per lingua (it/, en/)
  test/setup.ts         preparazione dei test
```

Regole di progetto:

- **Nessun testo visibile scritto nei componenti**: va in `src/i18n/locales/<lingua>/ui.json`. ESLint lo segnala.
- Le chiavi di traduzione sono **tipizzate**: una chiave inesistente è un errore di compilazione.
- I test verificano che italiano e inglese abbiano le stesse chiavi e che ogni mondo e livello abbia i testi in entrambe le lingue.
- `state/` e (in futuro) `engine/` non importano React: sono funzioni pure, testabili da sole.

## Aggiungere un testo all'interfaccia

1. Aggiungi la chiave in `src/i18n/locales/it/ui.json` e in `src/i18n/locales/en/ui.json`.
2. Usala nel componente con `const { t } = useTranslation();` e `t('sezione.chiave')`.

## Dati salvati nel browser

Tutte le chiavi in `localStorage` iniziano con `ddc:`. Al momento:

- `ddc:settings` → lingua e tema (letta anche dallo script in `index.html` per evitare il lampo bianco col tema scuro).
- `ddc:progress` → progressi: lezioni lette, missioni, suggerimenti, badge, giorni di studio, bozze.
  Ha un numero di versione (`src/types/progress.ts`): se la struttura cambia, si aggiunge una migrazione
  in `src/state/progress-storage.ts` così i progressi degli studenti non vanno persi.

## Progressi e gamification

- `src/engine/` contiene le regole, come funzioni pure senza React: XP e gradi (`xp.ts`), serie di giorni
  (`streak.ts`), badge (`badges.ts`). I valori di XP e le soglie dei gradi si cambiano lì.
- `src/state/progressReducer.ts` applica le azioni (lezione letta, tentativo, suggerimento, missione superata…).
- `ProgressProvider` salva a ogni modifica; `useProgress()` dà accesso a stato, XP, grado e azioni.
- Dalla pagina Profilo si esportano, importano e azzerano i progressi.
