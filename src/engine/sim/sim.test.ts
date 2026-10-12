import { describe, expect, it } from 'vitest';
import { checkGoals, type Goal } from './goals';
import { Machine, type MachineSetup } from './machine';
import { parseLine } from './parse';
import type { OutputLine } from './types';

/** Macchina con un orologio controllabile. */
function setup(config: MachineSetup = {}) {
  let time = Date.UTC(2026, 9, 11, 10, 0, 0);
  const machine = new Machine(config, () => time);
  const advance = (seconds: number) => {
    time += seconds * 1000;
  };
  /** Esegue e restituisce il testo mostrato (senza la riga col prompt). */
  const run = (line: string) => text(machine.exec(line).lines);
  return { machine, run, advance };
}

function text(lines: OutputLine[]): string {
  return lines
    .filter((l): l is Extract<OutputLine, { kind: 'out' | 'err' }> => l.kind === 'out' || l.kind === 'err')
    .map((l) => l.text)
    .join('\n');
}

function hints(lines: OutputLine[]): string[] {
  return lines.flatMap((l) => (l.kind === 'hint' ? [l.key] : []));
}

describe('analisi della riga di comando', () => {
  it('rispetta virgolette, variabili e barre rovesciate', () => {
    const result = parseLine(`echo "ciao $USER" 'resta $USER' a\\ b`, { USER: 'studente' });
    expect(result).toEqual({
      ok: true,
      list: [{ onlyIfOk: false, pipeline: [{ argv: ['echo', 'ciao studente', 'resta $USER', 'a b'] }] }],
    });
  });

  it('riconosce pipe, redirezioni e sequenze', () => {
    const result = parseLine('cat a.txt | grep x > b.txt && ls; pwd');
    expect(result.ok && result.list.map((step) => step.pipeline.map((c) => c.argv[0]))).toEqual([
      ['cat', 'grep'],
      ['ls'],
      ['pwd'],
    ]);
    expect(result.ok && result.list[0]?.pipeline[1]?.redirect).toEqual({ append: false, target: 'b.txt' });
    expect(result.ok && result.list[1]?.onlyIfOk).toBe(true);
  });

  it('segnala gli errori di sintassi come bash', () => {
    expect(parseLine('echo "ciao')).toEqual({
      ok: false,
      error: 'bash: unexpected EOF while looking for matching `"\'',
    });
    expect(parseLine('ls |')).toEqual({ ok: false, error: "bash: syntax error near unexpected token `newline'" });
    expect(parseLine('echo ciao >')).toEqual({ ok: false, error: "bash: syntax error near unexpected token `newline'" });
  });
});

describe('shell simulata', () => {
  it('parte dalla cartella personale con il prompt di bash', () => {
    const { machine, run } = setup();
    expect(machine.prompt).toBe('studente@corso:~$ ');
    expect(run('pwd')).toBe('/home/studente');
    expect(run('whoami')).toBe('studente');
  });

  it('crea cartelle e file, ci entra e li elenca', () => {
    const { machine, run } = setup();
    expect(run('mkdir progetto')).toBe('');
    expect(run('touch note.txt')).toBe('');
    expect(run('ls')).toBe('note.txt  progetto');
    run('cd progetto');
    expect(machine.prompt).toBe('studente@corso:~/progetto$ ');
    expect(run('pwd')).toBe('/home/studente/progetto');
    run('cd ..');
    expect(machine.cwd).toBe('/home/studente');
    run('cd -');
    expect(machine.cwd).toBe('/home/studente/progetto');
    run('cd');
    expect(machine.cwd).toBe('/home/studente');
  });

  it('mostra i dettagli con ls -l e i file nascosti con -a', () => {
    const { run } = setup({ file: { 'ciao.txt': 'ciao\n', '.segreto': '' } });
    const long = run('ls -l').split('\n');
    expect(long[0]).toMatch(/^total \d+$/);
    expect(long[1]).toMatch(/^-rw-r--r-- 1 studente studente 5 Oct 11 \d\d:00 ciao\.txt$/);
    expect(run('ls')).toBe('ciao.txt');
    expect(run('ls -a')).toBe('.  ..  ciao.txt  .segreto');
  });

  it('scrive, aggiunge e legge file con > >> e cat', () => {
    const { run } = setup();
    run('echo prima riga > diario.txt');
    run('echo seconda riga >> diario.txt');
    expect(run('cat diario.txt')).toBe('prima riga\nseconda riga');
  });

  it('collega i comandi con la pipe', () => {
    const { run } = setup({ file: { 'spesa.txt': 'mele\npane\nmelone\nlatte\n' } });
    expect(run('grep mel spesa.txt')).toBe('mele\nmelone');
    expect(run('cat spesa.txt | grep mel | wc -l')).toBe('2');
    expect(run('sort spesa.txt | head -n 2')).toBe('latte\nmele');
  });

  it('dà gli stessi messaggi d\'errore di bash e coreutils', () => {
    const { run } = setup();
    expect(run('cd nulla')).toBe('bash: cd: nulla: No such file or directory');
    expect(run('cat nulla.txt')).toBe('cat: nulla.txt: No such file or directory');
    expect(run('ls nulla')).toBe("ls: cannot access 'nulla': No such file or directory");
    run('mkdir cartella');
    expect(run('mkdir cartella')).toBe('mkdir: cannot create directory ‘cartella’: File exists');
    expect(run('mkdir a/b')).toBe('mkdir: cannot create directory ‘a/b’: No such file or directory');
    expect(run('rm cartella')).toBe("rm: cannot remove 'cartella': Is a directory");
    expect(run('cat cartella')).toBe('cat: cartella: Is a directory');
  });

  it('copia, sposta e cancella', () => {
    const { machine, run } = setup({ file: { 'a.txt': 'A' } });
    run('mkdir -p archivio/2026');
    run('cp a.txt b.txt');
    run('mv b.txt archivio/2026');
    expect(run('ls archivio/2026')).toBe('b.txt');
    expect(run('cp archivio copia')).toBe("cp: -r not specified; omitting directory 'archivio'");
    run('cp -r archivio copia');
    expect(machine.fs.get('/home/studente/copia/2026/b.txt')).toBeDefined();
    run('rm -r copia');
    expect(machine.fs.get('/home/studente/copia')).toBeUndefined();
    run('touch vuota.txt && rm vuota.txt');
    expect(run('ls')).toBe('a.txt  archivio');
  });

  it('&& esegue il secondo comando solo se il primo riesce', () => {
    const { run } = setup();
    expect(run('cd nulla && echo dentro')).toBe('bash: cd: nulla: No such file or directory');
    expect(run('mkdir x && cd x && pwd')).toBe('/home/studente/x');
  });

  it('spiega i comandi sconosciuti', () => {
    const { machine } = setup();
    const { lines } = machine.exec('pippo');
    expect(text(lines)).toBe('pippo: command not found');
    expect(hints(lines)).toEqual(['unknownCommand']);
  });

  it('offre --help, history e clear', () => {
    const { machine, run } = setup();
    expect(run('ls --help')).toMatch(/^Usage: ls \[OPTION\]\.\.\. \[FILE\]\.\.\./);
    run('pwd');
    expect(run('history')).toBe('    1  ls --help\n    2  pwd\n    3  history');
    expect(machine.exec('clear')).toEqual({ lines: [], clear: true });
  });

  it('completa nomi di comandi e file con Tab', () => {
    const { machine } = setup({ cartelle: ['progetto'], file: { 'promemoria.txt': '' } });
    expect(machine.complete('mkd')).toBe('mkdir ');
    expect(machine.complete('cd prog')).toBe('cd progetto/');
    expect(machine.complete('cat pro')).toBe(null); // due possibilità: progetto/ e promemoria.txt
  });
});

describe('Docker simulato', () => {
  it('docker run hello-world: scarica l\'immagine e stampa il messaggio', () => {
    const { run } = setup();
    const output = run('docker run hello-world');
    expect(output).toMatch(/^Unable to find image 'hello-world:latest' locally\nlatest: Pulling from library\/hello-world\n[0-9a-f]{12}: Pull complete\nDigest: sha256:[0-9a-f]{64}\nStatus: Downloaded newer image for hello-world:latest\n/);
    expect(output).toContain('Hello from Docker!');
    expect(output).toContain('https://docs.docker.com/get-started/');
    // La seconda volta l'immagine c'è già: niente download.
    expect(run('docker run hello-world')).not.toContain('Unable to find image');
  });

  it('elenca le immagini con la vista di Docker 29', () => {
    const { run } = setup();
    run('docker pull alpine');
    const lines = run('docker images').split('\n');
    expect(lines[0]).toMatch(/^IMAGE\s{3,}ID\s{3,}DISK USAGE\s{3}CONTENT SIZE\s{3}EXTRA$/);
    expect(lines[1]).toMatch(/^alpine:latest\s{3,}[0-9a-f]{12}\s+13\.1MB\s+3\.8MB$/);
    run('docker run alpine echo ciao');
    expect(run('docker images')).toMatch(/^i Info → {3}U {2}In Use\n\n/);
  });

  it('avvia nginx in sottofondo e lo mostra in docker ps', () => {
    const { machine, run, advance } = setup();
    const id = run('docker run -d -p 8080:80 --name web nginx').split('\n').pop() ?? '';
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    advance(5);
    const [header, row] = run('docker ps').split('\n');
    expect(header).toBe(
      'CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS                                     NAMES',
    );
    expect(row).toBe(
      `${id.slice(0, 12)}   nginx     "/docker-entrypoint.…"   5 seconds ago   Up 5 seconds   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp   web`,
    );
    expect(machine.docker.findContainer('web')?.state).toBe('running');
  });

  it('riproduce gli errori più comuni', () => {
    const { run } = setup();
    run('docker run -d -p 8080:80 --name web nginx');
    expect(run('docker run -d --name web nginx')).toMatch(
      /^docker: Error response from daemon: Conflict\. The container name "\/web" is already in use by container "[0-9a-f]{64}"\./,
    );
    expect(run('docker run -d -p 8080:80 nginx')).toMatch(/Bind for 0\.0\.0\.0:8080 failed: port is already allocated/);
    expect(run('docker rm web')).toBe(
      'Error response from daemon: cannot remove container "web": container is running: stop the container before removing or force remove',
    );
    expect(run('docker stop nulla')).toBe('Error response from daemon: No such container: nulla');
    expect(run('docker run immagine-inesistente')).toContain(
      "pull access denied for immagine-inesistente, repository does not exist or may require 'docker login'",
    );
    expect(run('docker biscotti')).toBe("docker: unknown command: docker biscotti\n\nRun 'docker --help' for more information");
  });

  it('ferma, riavvia ed elimina i container', () => {
    const { machine, run, advance } = setup();
    run('docker run -d --name web nginx');
    expect(run('docker stop web')).toBe('web');
    advance(3);
    expect(run('docker ps')).not.toContain('web');
    expect(run('docker ps -a')).toContain('Exited (0) 3 seconds ago');
    expect(run('docker start web')).toBe('web');
    expect(machine.docker.findContainer('web')?.state).toBe('running');
    expect(run('docker rm -f web')).toBe('web');
    expect(machine.docker.containers).toHaveLength(0);
  });

  it('un container con un comando a tempo termina da solo', () => {
    const { machine, run, advance } = setup();
    run('docker run -d --name pausa alpine sleep 30');
    expect(machine.docker.findContainer('pausa')?.state).toBe('running');
    advance(31);
    expect(run('docker ps -a')).toContain('Exited (0) 1 second ago');
  });

  it('postgres senza password si ferma con il suo messaggio d\'errore', () => {
    const { run } = setup({ immagini: ['postgres'] });
    expect(run('docker run --name db postgres')).toContain(
      'Error: Database is uninitialized and superuser password is not specified.',
    );
    expect(run('docker ps -a')).toContain('Exited (1)');
    run('docker rm db');
    run('docker run -d --name db -e POSTGRES_PASSWORD=segreta postgres');
    expect(run('docker logs db')).toContain('database system is ready to accept connections');
  });

  it('esegue comandi dentro un container acceso', () => {
    const { run } = setup({ immagini: ['nginx'] });
    run('docker run -d --name web nginx');
    expect(run('docker exec web cat /etc/os-release')).toContain('PRETTY_NAME="Debian GNU/Linux');
    run('docker stop web');
    expect(run('docker exec web ls')).toMatch(/^Error response from daemon: container [0-9a-f]{64} is not running$/);
  });

  it('nginx in primo piano viene fermato con Ctrl+C e lo spiega', () => {
    const { machine } = setup({ immagini: ['nginx'] });
    const { lines } = machine.exec('docker run --name web nginx');
    expect(text(lines)).toContain('Configuration complete; ready for start up');
    expect(hints(lines)).toEqual(['foregroundStopped']);
    expect(machine.docker.findContainer('web')?.state).toBe('exited');
  });

  it('non cancella un\'immagine usata da un container', () => {
    const { run } = setup();
    run('docker run hello-world');
    expect(run('docker rmi hello-world')).toMatch(/^Error response from daemon: conflict: unable to remove repository reference "hello-world" \(must force\)/);
    run('docker rm $(docker ps -aq)'); // non supportato: resta il container
    run('docker rmi -f hello-world');
    expect(run('docker images')).not.toContain('hello-world');
  });
});

describe('obiettivi delle missioni', () => {
  it('controllano lo stato finale, non il testo digitato', () => {
    const { machine, run } = setup();
    const goals = [
      { tipo: 'esiste', percorso: '~/progetto', come: 'cartella' },
      { tipo: 'cartella-corrente', percorso: '~/progetto' },
      { tipo: 'file-contiene', percorso: '~/progetto/note.txt', testo: 'ciao' },
      { tipo: 'container', immagine: 'nginx', stato: 'running', porta: '8080:80' },
      { tipo: 'comando-eseguito', programma: 'ls' },
    ] as const;
    expect(checkGoals(goals, machine)).toEqual([false, false, false, false, false]);
    run('mkdir progetto && cd progetto && echo ciao > note.txt');
    run('docker run -d -p 8080:80 nginx');
    run('ls');
    expect(checkGoals(goals, machine)).toEqual([true, true, true, true, true]);
  });

  it('un comando fallito non conta come eseguito', () => {
    const { machine, run } = setup();
    run('ls nulla');
    expect(checkGoals([{ tipo: 'comando-eseguito', programma: 'ls' }], machine)).toEqual([false]);
  });
});

describe('opzioni e conferme', () => {
  it('rifiuta le opzioni sconosciute come i coreutils', () => {
    const { run } = setup();
    expect(run('ls -z')).toBe("ls: invalid option -- 'z'\nTry 'ls --help' for more information.");
    expect(run('ls --pippo')).toBe("ls: unrecognized option '--pippo'\nTry 'ls --help' for more information.");
    expect(run('mkdir -x prova')).toBe("mkdir: invalid option -- 'x'\nTry 'mkdir --help' for more information.");
  });

  it('ls -lh mostra le dimensioni leggibili', () => {
    const { run } = setup({ cartelle: ['cartella'] });
    expect(run('ls -lh')).toMatch(/^total \d+\ndrwxr-xr-x 2 studente studente 4\.0K /);
  });

  it('rm -i chiede conferma e (nel simulatore) non cancella', () => {
    const { machine } = setup({ file: { 'a.txt': 'x', 'vuoto.txt': '' } });
    const { lines } = machine.exec('rm -i a.txt vuoto.txt');
    expect(text(lines)).toBe("rm: remove regular file 'a.txt'? \nrm: remove regular empty file 'vuoto.txt'? ");
    expect(hints(lines)).toEqual(['promptAnsweredNo']);
    expect(machine.fs.get('/home/studente/a.txt')).toBeDefined();
  });

  it('cp -i non sovrascrive un file esistente', () => {
    const { machine, run } = setup({ file: { 'a.txt': 'nuovo', 'b.txt': 'vecchio' } });
    expect(run('cp -i a.txt b.txt')).toBe("cp: overwrite 'b.txt'? ");
    expect(machine.fs.get('/home/studente/b.txt')).toMatchObject({ content: 'vecchio' });
    run('cp a.txt b.txt');
    expect(machine.fs.get('/home/studente/b.txt')).toMatchObject({ content: 'nuovo' });
  });

  it('gli obiettivi riconoscono le opzioni in ogni forma e le alternative', () => {
    const goal: Goal = { tipo: 'comando-eseguito', programma: 'ls', opzioni: ['a|all'] };
    for (const command of ['ls -a', 'ls -la', 'ls -l -a', 'ls --all']) {
      const { machine } = setup();
      machine.exec(command);
      expect(checkGoals([goal], machine), command).toEqual([true]);
    }
    const { machine } = setup();
    machine.exec('ls -l');
    expect(checkGoals([goal], machine)).toEqual([false]);

    const either: Goal = {
      tipo: 'uno-tra',
      obiettivi: [
        { tipo: 'comando-eseguito', programma: 'mkdir', argomenti: ['--help'] },
        { tipo: 'comando-eseguito', programma: 'man', argomenti: ['mkdir'] },
      ],
    };
    machine.exec('man mkdir');
    expect(checkGoals([either], machine)).toEqual([true]);
  });
});

