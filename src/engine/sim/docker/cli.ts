import { fail, hint, ok, type CommandOutput } from '../types';
import { DOCKER_USAGE, DOCKER_VERSION, type DockerEngine } from './docker';

/** Instrada `docker <comando> ...` verso il metodo giusto del Docker simulato. */
export function dockerCli(engine: DockerEngine, args: string[]): CommandOutput {
  const [first, ...rest] = args;
  if (first === undefined || first === '--help' || first === 'help') return ok(DOCKER_USAGE);
  if (first === '--version' || first === '-v') return ok(`Docker version ${DOCKER_VERSION}, build 4c4f3f9\n`);

  // "docker container ls" = "docker ps", "docker image ls" = "docker images", ecc.
  let command = first;
  let params = rest;
  if (first === 'container' || first === 'image') {
    const sub = rest[0];
    params = rest.slice(1);
    const map: Record<string, Record<string, string>> = {
      container: { ls: 'ps', list: 'ps', ps: 'ps', run: 'run', start: 'start', stop: 'stop', restart: 'restart', kill: 'kill', rm: 'rm', remove: 'rm', logs: 'logs', exec: 'exec' },
      image: { ls: 'images', list: 'images', pull: 'pull', rm: 'rmi', remove: 'rmi' },
    };
    const mapped = sub ? map[first]?.[sub] : undefined;
    if (!mapped) {
      return { stdout: '', extra: [hint('notSimulated', { command: `docker ${first} ${sub ?? ''}`.trim() })], code: 1 };
    }
    command = mapped;
  }

  if (params.includes('--help')) {
    return { stdout: '', extra: [hint('notSimulated', { command: `docker ${command} --help` })], code: 0 };
  }

  switch (command) {
    case 'run':
      return engine.run(params);
    case 'ps':
      return engine.ps(params);
    case 'images':
      return engine.images();
    case 'pull':
      return engine.pullCommand(params);
    case 'stop':
      return engine.stopCommand(params);
    case 'start':
      return engine.startCommand(params);
    case 'restart':
      return engine.restartCommand(params);
    case 'kill':
      return engine.killCommand(params);
    case 'rm':
      return engine.rmCommand(params);
    case 'logs':
      return engine.logsCommand(params);
    case 'exec':
      return engine.execCommand(params);
    case 'rmi':
      return engine.rmiCommand(params);
    case 'version':
      return engine.version();
    case 'build':
    case 'compose':
    case 'volume':
    case 'network':
    case 'inspect':
    case 'info':
    case 'login':
    case 'logout':
    case 'push':
    case 'search':
    case 'tag':
    case 'system':
    case 'stats':
      return { stdout: '', extra: [hint('notSimulated', { command: `docker ${command}` })], code: 1 };
    default:
      return fail(1, `docker: unknown command: docker ${command}`, '', "Run 'docker --help' for more information");
  }
}
