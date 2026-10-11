# Piano del corso "Docker & DevOps da zero"

Documento di progettazione. Serve come riferimento per lo sviluppo del sito (GitHub Pages) e dei contenuti.

---

## 1. Obiettivo e pubblico

- **Pubblico**: principianti assoluti. Si assume solo che lo studente sappia usare un computer (browser, file, cartelle). Nessuna esperienza di terminale, Linux, reti o programmazione.
- **Obiettivo finale**: lo studente sa, in autonomia,
  - containerizzare un'applicazione reale,
  - comporre applicazioni multi-servizio,
  - costruire una pipeline CI/CD che crea, testa e pubblica immagini,
  - fare il deploy su un server con HTTPS, log, monitoraggio di base e sicurezza ragionevole,
  - diagnosticare e risolvere problemi leggendo errori e documentazione ufficiale,
  - capire quando serve un orchestratore (Kubernetes) e da dove partire.

## 2. Unità di suddivisione: Mondi e Livelli

Scelta: **Livelli raggruppati in Mondi**.

- "Giornate" imporrebbe un ritmo e farebbe sentire in ritardo chi va più piano.
- "Capitoli" è adatto a un libro ma non alla gamification.
- I **Livelli** si sbloccano in sequenza; i **Mondi** danno tappe intermedie chiare, ognuna chiusa da una **Sfida del Boss** che verifica tutto il Mondo.

Struttura di ogni livello:

1. Lezioni brevi (5-10 minuti di lettura ciascuna)
2. Missioni (esercizi) dopo ogni lezione
3. Sfida finale del livello
4. Riepilogo e scheda "comandi/concetti nuovi"

## 3. Regole didattiche (contro la "maledizione della conoscenza")

Valgono per OGNI lezione:

1. **Nessun termine prima della sua definizione.** Ogni lezione dichiara nei metadati:
   - `concetti_richiesti`: già spiegati in lezioni precedenti
   - `concetti_introdotti`: spiegati qui per la prima volta
   Uno script di verifica controlla che nessuna lezione usi un concetto non ancora introdotto.
2. **Schema fisso della lezione**:
   - *Perché ti serve*: il problema reale che risolve
   - *Analogia*: un paragone dal mondo quotidiano
   - *Il concetto*: spiegazione semplice
   - *Esempio*: comando o file reale
   - *Riga per riga*: ogni parte dell'esempio spiegata (ogni flag, ogni parola chiave)
   - *Cosa vedrai*: l'output atteso, spiegato
   - *Errori comuni*: messaggi d'errore tipici e cosa significano
   - *In breve*: 3-5 punti di riepilogo
3. **Glossario integrato**: ogni termine tecnico ha un tooltip con definizione e link alla lezione che lo introduce.
4. **Frasi corte, un concetto per paragrafo**, niente sigle non sciolte.
5. **Mai "semplicemente" o "ovviamente".**
6. **Ripetizione distribuita**: concetti chiave ripresi nei quiz dei livelli successivi.
7. **Ogni argomento rimanda alla documentazione ufficiale e aggiornata** (vedi sezione 10). Ogni lezione chiude con un riquadro "Approfondisci nella documentazione ufficiale" con i link esatti alle pagine usate. Lo scopo è anche didattico: abituare lo studente a consultare le fonti originali è parte dell'autonomia.

## 4. Mappa del corso

Tempi indicativi per studio + esercizi.

### Mondo 0 · Campo Base (le fondamenta)
Prima di Docker servono le basi su cui Docker poggia.

| Livello | Titolo | Contenuti |
|---|---|---|
| 0 | Come funziona questo corso | Navigazione, XP, missioni, come funzionano i controlli, salvataggio locale ed esportazione dei progressi |
| 1 | Il computer dietro le quinte | Hardware vs software, sistema operativo, kernel, programma vs processo, file e cartelle, cos'è un'"applicazione", dipendenze e librerie, versioni |
| 2 | Il terminale | Cos'è una shell, prompt, comando/argomenti/opzioni (flag), percorsi assoluti e relativi, `pwd` `ls` `cd` `mkdir` `cp` `mv` `rm` `cat`, `--help` e `man`, frecce e Tab |
| 3 | Linux essenziale | Perché Linux (i container sono Linux), struttura delle cartelle (`/etc`, `/var`, `/home`…), utenti e root, permessi, `sudo`, gestore pacchetti (`apt`), variabili d'ambiente, pipe e redirezione, editor `nano`, processi (`ps`, `kill`) |
| 4 | Reti per principianti | Indirizzo IP, porta, `localhost`, client e server, DNS, HTTP e richieste/risposte, codici di stato, `curl` |
| 5 | Il problema che Docker risolve | "Sul mio PC funziona", conflitti di dipendenze, macchine virtuali, container vs VM, cos'è Docker, immagine vs container (analogia: ricetta e piatto / stampo e oggetto) |

**Boss del Mondo 0**: preparare la "scrivania" di un progetto da terminale e spiegare perché un'app va in errore su un altro PC.

### Mondo 1 · Primi passi con Docker

| Livello | Titolo | Contenuti |
|---|---|---|
| 6 | Installare e capire Docker | Docker Desktop vs Docker Engine, alternative senza installazione (Codespaces), architettura client → daemon, `docker version`, `hello-world` spiegato riga per riga |
| 7 | Vita di un container | `run`, `ps` (`-a`), `stop`, `start`, `rm`, `logs`, `exec`, modalità `-it` e `-d`, `--name`, stati del container, `--rm` |
| 8 | Le immagini | Registry e Docker Hub, nome:tag, `latest` e i suoi rischi, `pull`, `images`, `rmi`, layer, immagini ufficiali, leggere la pagina di un'immagine |
| 9 | Aprire le porte | Perché un container è isolato, `-p host:container`, avviare nginx e aprirlo nel browser, porte occupate |
| 10 | I dati non spariscono (se sai come) | Container effimeri, volumi, bind mount, differenze e quando usarli, `docker volume`, backup di un volume |
| 11 | Configurare i container | Variabili d'ambiente (`-e`, `--env-file`), limiti di risorse (`--memory`, `--cpus`), politiche di riavvio, `inspect`, pulizia (`system prune`, `system df`) |

**Boss del Mondo 1**: avviare un database e un pannello web di amministrazione, con dati che sopravvivono alla cancellazione del container.

### Mondo 2 · Costruire le proprie immagini

| Livello | Titolo | Contenuti |
|---|---|---|
| 12 | Il primo Dockerfile | Cos'è un Dockerfile, `FROM`, `RUN`, `COPY`, `WORKDIR`, `CMD`, `docker build -t`, build context |
| 13 | Un'app vera in un'immagine | Cos'è un'app web minima (spiegata da zero), containerizzare un'app Python e una Node.js, `EXPOSE`, `ENV`, `ARG` |
| 14 | Cache e layer | Come funziona la cache, ordine delle istruzioni, `.dockerignore`, `docker history` |
| 15 | CMD vs ENTRYPOINT | Forma exec vs shell, segnali e arresto pulito, PID 1 |
| 16 | Immagini leggere | Immagini base (`slim`, `alpine`, `distroless`), multi-stage build, dimensioni a confronto |

**Boss del Mondo 2**: containerizzare da zero un'app fornita, con immagine sotto una dimensione massima e build che sfrutta la cache.

### Mondo 3 · Applicazioni multi-container

| Livello | Titolo | Contenuti |
|---|---|---|
| 17 | Le reti di Docker | Rete bridge predefinita, reti personalizzate, DNS interno (i container si trovano per nome), `host` e `none` |
| 18 | YAML da zero | Chiave/valore, indentazione, liste, oggetti annidati, stringhe e numeri, errori tipici |
| 19 | Docker Compose | `compose.yaml`, `services`, `image` vs `build`, `ports`, `volumes`, `environment`, `up` / `down` / `logs` / `ps` |
| 20 | Compose avanzato | `depends_on` con `healthcheck`, file `.env`, profili, override per ambienti diversi |
| 21 | Uno stack completo | Frontend + API + database + cache, flusso di una richiesta tra i servizi |

**Boss del Mondo 3**: fare funzionare uno stack rotto (errori di rete, porte, variabili e ordine di avvio da correggere).

### Mondo 4 · DevOps

| Livello | Titolo | Contenuti |
|---|---|---|
| 22 | Cos'è DevOps | Ciclo di vita del software, sviluppo / test / staging / produzione, automazione, cultura e responsabilità condivisa |
| 23 | Git e GitHub da zero | Repository, commit, branch, push/pull, pull request, `.gitignore` |
| 24 | Pubblicare immagini | Registry (Docker Hub, GitHub Container Registry), login, `tag`, `push`, strategia di versioni (semver, SHA del commit) |
| 25 | CI con GitHub Actions | Cos'è la CI, workflow YAML, eventi, job, step, runner, eseguire test in un container |
| 26 | CD: dalla build al rilascio | Build e push automatici, build multi-architettura, cache nella pipeline, ambienti e approvazioni |
| 27 | Configurazione e segreti | Principi "12-factor", segreti di GitHub, segreti in Compose, cosa non mettere mai in un'immagine |

**Boss del Mondo 4**: pipeline completa che a ogni push testa l'app, costruisce l'immagine e la pubblica con il tag corretto.

### Mondo 5 · Produzione

| Livello | Titolo | Contenuti |
|---|---|---|
| 28 | Sicurezza dei container | Utente non root, privilegi minimi, capabilities, file system in sola lettura, scansione vulnerabilità (Trivy / Docker Scout), aggiornare le immagini base |
| 29 | Il server | Cos'è un VPS, SSH e chiavi, installare Docker su un server, firewall di base |
| 30 | Reverse proxy e HTTPS | Cos'è un reverse proxy, Traefik o nginx, domini, certificati con Let's Encrypt |
| 31 | Osservabilità | Log (driver, rotazione), `docker stats`, healthcheck, metriche di base, avvisi |
| 32 | Metodo di troubleshooting | Procedura passo per passo: leggere l'errore, `logs`, `inspect`, `exec`, rete, permessi; esercizi su guasti reali |

**Boss del Mondo 5**: mettere in produzione lo stack del Mondo 3, in HTTPS, con utente non root e healthcheck, e risolvere un guasto simulato.

### Mondo 6 · Oltre e autonomia

| Livello | Titolo | Contenuti |
|---|---|---|
| 33 | Orchestrazione | Perché un server non basta, alta disponibilità, scalare, concetti di Kubernetes (pod, deployment, service) collegati a ciò che lo studente già sa |
| 34 | Diventare autonomi | Leggere la documentazione ufficiale, cercare un errore in modo efficace, scegliere un'immagine affidabile, cheat sheet finale, percorsi successivi |
| 35 | Progetto finale | Un'app scelta dallo studente: Dockerfile, Compose, pipeline CI/CD, deploy, checklist di sicurezza |

**Certificato finale** (generato in locale) al completamento.

## 5. Gamification

- **XP**: lezione letta, missione superata, boss sconfitto (valori diversi).
- **Gradi** in base agli XP: Mozzo → Marinaio → Timoniere → Capitano → Ammiraglio dei container.
- **Badge** per traguardi: primo container, prima immagine, zero suggerimenti usati in un Mondo, boss al primo tentativo, pipeline verde, ecc.
- **Suggerimenti progressivi** (3 livelli: indizio, indizio forte, soluzione commentata); ogni suggerimento riduce gli XP della missione.
- **Sblocco sequenziale** dei livelli; i Mondi già completati restano rigiocabili.
- **Serie (streak)** di giorni di studio, solo come incentivo, senza penalità.
- **Ripasso**: quiz rapidi casuali sui livelli già completati per guadagnare XP extra.

## 6. Tipi di esercizio e come si verificano

Tutti i controlli avvengono nel browser (sito statico). Sono pensati per l'autoapprendimento, non come esame anti-imbroglio.

| Tipo | Descrizione | Verifica |
|---|---|---|
| Quiz | Scelta multipla, vero/falso, abbinamenti, riordinare passaggi | Confronto con le risposte attese |
| Completa il comando | Riempire le parti mancanti | Espressioni regolari / normalizzazione degli spazi |
| Terminale simulato | Shell finta (xterm.js) con un "Docker simulato" in JavaScript che tiene uno stato (container, immagini, volumi, reti) | Si controlla lo **stato finale** (es. "esiste un container nginx in esecuzione con porta 8080 pubblicata"), non il testo esatto: più comandi corretti diversi sono accettati |
| Editor di file | Scrivere Dockerfile, `compose.yaml`, workflow di Actions | Parser (YAML con js-yaml, Dockerfile con parser dedicato) + regole: istruzioni presenti, ordine, best practice. Messaggi d'errore spiegati, non solo "sbagliato" |
| Trova l'errore | File o comando guasto da correggere | Come sopra, sul file corretto dallo studente |
| Laboratorio reale | Esercizio su Docker vero in GitHub Codespaces (o in locale) | Script `verifica.sh` nel repository dei laboratori: controlla lo stato reale (container, porte, risposte HTTP) e stampa un **codice di completamento**; lo studente lo incolla nel sito che lo valida |

Ogni verifica restituisce un feedback in tre parti: cosa è corretto, cosa manca, un suggerimento sul perché.

## 7. Salvataggio dei progressi

- Tutto in `localStorage` del browser (nessun server, nessun account).
- Dati salvati: livelli completati, XP, badge, risposte, suggerimenti usati, contenuto degli editor, preferenze (tema).
- **Esporta / importa** i progressi come file JSON, per cambiare dispositivo o fare backup.
- Pulsante "Azzera progressi" con conferma.
- Versione dello schema dati per gestire aggiornamenti futuri del corso.

## 8. Architettura tecnica

**Decisioni prese**
- Laboratori su Docker reale tramite **GitHub Codespaces**: inclusi (richiedono un account GitHub gratuito allo studente; la quota gratuita mensile basta per il corso). Il Mondo 0 spiega come creare l'account.
- La web app è una **vera applicazione React**, a componenti, pubblicata come sito statico su GitHub Pages. Niente file unico.

### 8.1 Stack

| Ambito | Scelta | Motivo |
|---|---|---|
| Build | Vite | Veloce, produce file statici adatti a Pages |
| Linguaggio | TypeScript | I tipi documentano lezioni, esercizi e stato: manutenzione più facile |
| UI | React + componenti funzionali + hooks | Richiesta esplicita |
| Routing | React Router con **HashRouter** (`/#/mondo/1/livello/7`) | GitHub Pages non gestisce il fallback delle SPA: con l'hash i link diretti e il refresh funzionano senza trucchi |
| Stato globale | Context + `useReducer` | Nessuna libreria esterna; azioni esplicite e testabili |
| Contenuti | MDX (Markdown + componenti) con frontmatter | Le lezioni restano testo leggibile ma possono incorporare `<Glossario>`, `<Terminale>`, `<Quiz>` |
| Esercizi | JSON tipizzati, validati con Zod | Errori nei dati scoperti in build, non dallo studente |
| Terminale | xterm.js | Terminale realistico nel browser |
| Editor | CodeMirror 6 | Leggero, evidenziazione per Dockerfile e YAML |
| YAML | js-yaml | Verifica di Compose e workflow |
| Stile | **Tailwind CSS** (+ plugin typography per il testo delle lezioni) | Stili coerenti, niente CSS sparso; tema chiaro/scuro con la variante `dark:` |
| Lingue | **react-i18next** (i18next) | Interfaccia in italiano e inglese, cambio lingua al volo |
| Test | Vitest + React Testing Library | Test di componenti, reducer e verificatori |
| Qualità | ESLint + Prettier | Codice uniforme |
| Deploy | GitHub Actions → `actions/deploy-pages` | Ogni push su `main` pubblica il sito |

Configurazione da ricordare: in `vite.config.ts` impostare `base: '/<nome-repository>/'`.

### 8.2 Struttura delle cartelle

```
src/
  main.tsx                    # punto di ingresso
  App.tsx                     # provider + router
  routes/                     # pagine (una per rotta)
    HomePage.tsx
    MappaMondiPage.tsx
    LivelloPage.tsx
    LezionePage.tsx
    MissionePage.tsx
    ProfiloPage.tsx           # XP, badge, esporta/importa
    GlossarioPage.tsx
  components/
    layout/                   # AppShell, Header, Sidebar, Footer
    ui/                       # Button, Card, Modal, ProgressBar, Badge, Tooltip
    lezione/                  # LessonRenderer, Callout, Analogia, RigaPerRiga, ErroreComune
    esercizi/
      ExerciseRenderer.tsx    # sceglie il componente in base al tipo
      Quiz/
      CompletaComando/
      TerminaleSimulato/
      EditorFile/
      TrovaErrore/
      Laboratorio/            # pulsante Codespaces + campo codice
      shared/                 # FeedbackPanel, HintButton, RisultatoMissione
    gamification/             # XpBar, GradoBadge, BadgeGrid, StreakCounter, BossIntro
  context/
    ProgressContext.tsx       # XP, livelli completati, badge, risposte
    SettingsContext.tsx       # tema, dimensione testo
  state/
    progressReducer.ts        # azioni: COMPLETA_MISSIONE, USA_SUGGERIMENTO, SBLOCCA_BADGE...
    persistence.ts            # localStorage, versione schema, migrazioni, export/import JSON
  engine/                     # logica pura, senza React (facile da testare)
    dockerSim/                # Docker simulato: stato, parser comandi, comandi
    checkers/                 # verificatori: quiz, regex, stato, dockerfile, yaml
    labCodes.ts               # validazione codici dei laboratori
    xp.ts, badges.ts, unlock.ts
  i18n/
    index.ts                  # configurazione i18next, lingua iniziale, fallback
    locales/
      it/ui.json              # testi dell'interfaccia
      en/ui.json
  content/
    mondi.json                # struttura mondi/livelli (id, ordine, XP) - senza testi
    fonti.json                # registro delle documentazioni ufficiali (vedi sezione 10)
    it/
      mondi.json              # titoli e descrizioni tradotti
      glossario.json
      mondo-0/livello-01/
        01-sistema-operativo.mdx
        esercizi.json         # solo testi: domande, suggerimenti, feedback
    en/
      (stessa struttura)
    esercizi/
      mondo-0/livello-01.json # logica di verifica, comune alle due lingue
    ...
  hooks/                      # useProgress, useLocalStorage, useExercise, useHints
  types/                      # Lezione, Esercizio, Progresso, Badge...
scripts/
  verifica-contenuti.ts       # ordine dei concetti, link, schema esercizi
.github/workflows/
  deploy.yml                  # test + verifica contenuti + build + deploy
```

Principio guida: **`engine/` non importa mai React.** Docker simulato e verificatori sono funzioni pure, quindi testabili in isolamento e riutilizzabili. I componenti si occupano solo di mostrare.

### 8.3 Albero dei componenti principale

```
App
└─ SettingsProvider
   └─ ProgressProvider
      └─ HashRouter
         └─ AppShell (Header con XpBar e grado, Sidebar con mappa)
            ├─ MappaMondiPage → MondoCard → LivelloNode (bloccato/aperto/completato)
            ├─ LivelloPage → elenco lezioni e missioni, BossIntro
            ├─ LezionePage → LessonRenderer (MDX) → Callout, Analogia, RigaPerRiga, GlossarioTerm
            ├─ MissionePage → ExerciseRenderer → [Quiz | TerminaleSimulato | EditorFile | ...]
            │                 └─ FeedbackPanel, HintButton, RisultatoMissione
            └─ ProfiloPage → BadgeGrid, statistiche, Esporta/Importa/Azzera
```

### 8.4 Internazionalizzazione (italiano / inglese)

Tre livelli di traduzione, gestiti in modo diverso:

1. **Interfaccia** (pulsanti, menu, messaggi di sistema): file `ui.json` per lingua, letti con `useTranslation()`. Nessun testo scritto direttamente nei componenti: una regola ESLint (`i18next/no-literal-string`) lo impedisce.
2. **Lezioni**: un file MDX per lingua con lo stesso percorso (`content/it/...` e `content/en/...`). Stesso frontmatter tecnico (id, concetti, fonti), testo tradotto.
3. **Esercizi**: la **logica di verifica** è unica (`content/esercizi/...`) e i **testi** (domande, suggerimenti, feedback) sono per lingua, collegati tramite id. Così una correzione alla verifica vale per entrambe le lingue.

Altre regole:
- **Comandi, codice e output** di Docker restano in inglese in entrambe le lingue (sono così nella realtà). Nella versione italiana i commenti nel codice sono in italiano.
- La lingua scelta si salva nelle impostazioni (localStorage); alla prima visita si usa quella del browser, con italiano come riserva.
- Gli id interni (concetti, badge, missioni) sono neutri e non tradotti: il cambio lingua non tocca i progressi.
- Lo script di verifica dei contenuti segnala lezioni, voci di glossario o testi di esercizi presenti in una lingua e mancanti nell'altra.
- Il glossario conserva il termine inglese originale anche nella versione italiana (es. "volume", "bind mount"), perché è quello che lo studente troverà nella documentazione ufficiale.

### 8.5 Repository

- **Repository 1 – sito**: l'app React descritta sopra, pubblicata su GitHub Pages.
- **Repository 2 – laboratori**: una cartella per laboratorio con `.devcontainer/devcontainer.json` (Docker-in-Docker), `ISTRUZIONI.md` e `verifica.sh`. Il sito apre il laboratorio con un link "Apri in Codespaces" che punta alla configurazione giusta; `verifica.sh` controlla lo stato reale e stampa il codice di completamento.

## 9. Ordine di sviluppo suggerito

1. Scheletro: Vite + React + TypeScript, router, layout, workflow di deploy su Pages funzionante fin dal primo giorno.
2. `ProgressContext`, reducer, persistenza in localStorage con export/import.
3. Caricamento contenuti MDX + glossario + mappa mondi con sblocco.
4. Motore esercizi: Quiz e Completa il comando, con FeedbackPanel e suggerimenti.
5. Docker simulato + TerminaleSimulato (comandi del Mondo 1).
6. EditorFile con verificatori per Dockerfile e YAML.
7. Contenuti Mondo 0 e Mondo 1 → prima versione pubblicabile.
8. Repository laboratori, Codespaces, codici di completamento.
9. Mondi 2-6, badge, certificato.

## 10. Fonti ufficiali e aggiornamento

### 10.1 Regole

- Ogni lezione dichiara nel frontmatter le pagine di documentazione da cui è scritta:
  ```yaml
  fonti:
    - id: docker-run          # chiave del registro fonti.json
      url: https://docs.docker.com/reference/cli/docker/container/run/
  verificata_il: 2026-10-11
  versioni:
    docker_engine: "x.y"      # versione con cui sono stati provati i comandi
    compose: "x.y"
  ```
- Si usano **solo documentazioni ufficiali** del progetto o dello standard. Blog, tutorial e Stack Overflow non sono fonti.
- In fase di scrittura ogni lezione viene **controllata sulla documentazione corrente** e ogni comando viene **eseguito davvero** sulla versione indicata (anche per gli output del Docker simulato, che devono essere realistici).
- Si segue la sintassi attuale e si segnalano le forme superate quando lo studente potrebbe incontrarle online (es. `docker compose` al posto di `docker-compose`, campo `version:` dei file Compose obsoleto).
- Il riquadro di fine lezione mostra la data di ultima verifica.

### 10.2 Controlli automatici

- **A ogni push**: lo script di verifica contenuti controlla che ogni lezione abbia almeno una fonte, che ogni fonte sia nel registro e che l'URL appartenga a un dominio ammesso.
- **Ogni mese** (workflow programmato): controllo dei link (es. con lychee) e apertura automatica di una issue per link rotti o reindirizzati.
- **Lezioni scadute**: se `verificata_il` è più vecchia di 6 mesi, la issue mensile le elenca per una nuova revisione.
- Monitoraggio delle **release notes** di Docker Engine, Docker Compose e GitHub Actions: a ogni versione importante si rivedono le lezioni collegate.

### 10.3 Registro delle fonti ammesse (prima versione)

| Argomento | Documentazione ufficiale |
|---|---|
| Docker (concetti, CLI, Dockerfile, Compose, reti, volumi, sicurezza, Scout) | docs.docker.com |
| Specifica Compose | compose-spec.io, github.com/compose-spec |
| Standard immagini e container | opencontainers.org (OCI) |
| Trivy | trivy.dev |
| Linux: comandi e pagine di manuale | man7.org (Linux man-pages), gnu.org (Bash, coreutils) |
| Distribuzione usata negli esempi | documentation.ubuntu.com, debian.org/doc |
| Reti e HTTP | RFC su rfc-editor.org (es. RFC 9110 per HTTP); MDN Web Docs come supporto divulgativo |
| curl | curl.se/docs |
| Git | git-scm.com/doc |
| GitHub, Actions, Codespaces, Container Registry, Pages | docs.github.com |
| YAML | yaml.org/spec |
| Versionamento | semver.org |
| Configurazione delle app | 12factor.net |
| Reverse proxy | doc.traefik.io, nginx.org/en/docs |
| HTTPS e certificati | letsencrypt.org/docs |
| SSH | openssh.com/manual.html |
| Kubernetes | kubernetes.io/docs |
| Linguaggi delle app d'esempio | docs.python.org, nodejs.org/docs |

Il registro (`content/fonti.json`) è l'unico elenco ammesso: aggiungere una fonte richiede di inserirla lì, così la scelta resta consapevole e verificabile.

Nota sulle lingue: gran parte della documentazione ufficiale esiste solo in inglese. Nella versione italiana del corso i link restano quelli originali, segnalati con "(in inglese)"; dove esiste una versione ufficiale in italiano si usa quella.
