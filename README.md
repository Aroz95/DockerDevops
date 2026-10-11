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

## Scrivere una lezione

1. Crea il file `src/content/it/<id-livello>/<NN>-<nome>.mdx` (es. `come-funziona/02-punti-e-progressi.mdx`).
   `<NN>` decide l'ordine nel livello. Crea lo stesso file in `src/content/en/…` con il testo in inglese.
2. In testa al file, il frontmatter:

   ```yaml
   ---
   id: nome-lezione            # unico in tutto il corso, uguale nelle due lingue
   titolo: Titolo della lezione
   durata: 6                   # minuti di lettura
   tipo: tecnica               # oppure guida-corso (lezioni sul corso stesso)
   concetti_richiesti: [browser]
   concetti_introdotti: [cloud]
   fonti:
     - titolo: "GitHub Docs – …"
       url: https://docs.github.com/…
   verificata_il: "2026-10-11"
   ---
   ```

3. Ogni concetto introdotto va aggiunto in `src/content/<lingua>/glossario.json`.
4. Nel testo puoi usare, senza importarli: `<Termine id="cloud">cloud</Termine>`,
   `<Callout tipo="info|consiglio|attenzione">…</Callout>`, `<Analogia>…</Analogia>`.

I test bloccano la pubblicazione se:
- una lezione usa un concetto (o un `<Termine>`) prima che sia stato introdotto;
- italiano e inglese non hanno le stesse lezioni con gli stessi metadati;
- una fonte non è nel registro `src/content/fonti.json`, o una lezione tecnica non ha fonti;
- manca una voce del glossario.

Un livello si sblocca quando il precedente è completato; un livello senza lezioni appare "in preparazione".

## Scrivere una missione

Ogni missione ha due parti, così una correzione alla verifica vale per tutte le lingue:

- **logica** in `src/content/esercizi/<id-livello>.json`: tipo, risposte giuste, XP, lezione da cui dipende;
- **testi** in `src/content/<lingua>/esercizi/<id-livello>.json`: titolo, domanda, opzioni,
  feedback per le opzioni sbagliate, 1-3 suggerimenti, spiegazione finale.

Tipi disponibili:

| tipo | logica | testi in più |
|---|---|---|
| `scelta` | `opzioni`, `corretta` | `opzioni` (testo di ogni opzione), `feedback` |
| `scelta-multipla` | `opzioni`, `corrette` | come sopra |
| `ordina` | `elementi` nell'ordine giusto | `opzioni` (testo di ogni elemento) |
| `completa` | `risposte` (per ogni spazio, le varianti accettate), `ignoraMaiuscole` | `modello` con `___`, `feedbackSpazi` |

Le risposte di `completa` stanno nella logica: devono valere in tutte le lingue (comandi, numeri, nomi).
Per i comandi lascia `ignoraMaiuscole` a `false`: `docker Run` non è `docker run`.

Una missione si apre dopo aver letto la lezione indicata in `dopoLezione`; il livello è completo quando
tutte le lezioni sono lette e tutte le missioni superate. I test controllano la coerenza tra logica e testi.

## Progressi e gamification

- `src/engine/` contiene le regole, come funzioni pure senza React: XP e gradi (`xp.ts`), serie di giorni
  (`streak.ts`), badge (`badges.ts`). I valori di XP e le soglie dei gradi si cambiano lì.
- `src/state/progressReducer.ts` applica le azioni (lezione letta, tentativo, suggerimento, missione superata…).
- `ProgressProvider` salva a ogni modifica; `useProgress()` dà accesso a stato, XP, grado e azioni.
- Dalla pagina Profilo si esportano, importano e azzerano i progressi.
