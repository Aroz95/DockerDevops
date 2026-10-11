/**
 * Immagini disponibili nel "Docker Hub" simulato.
 *
 * Identificativi, dimensioni e versioni sono INDICATIVI: cambiano a ogni nuova pubblicazione
 * dell'immagine reale. Contano la forma e il comportamento (cosa stampa, se resta in esecuzione,
 * quali errori dà), che riproducono quelli delle immagini ufficiali.
 */

export interface ProgramResult {
  /** 'exit': stampa e termina. 'service': resta in esecuzione. 'interactive': aspetterebbe input. */
  kind: 'exit' | 'service' | 'interactive';
  stdout: string[];
  stderr?: string[];
  code: number;
  /** Per 'service' con durata limitata (es. sleep 30): millisecondi prima di terminare. */
  durationMs?: number;
}

export interface CatalogImage {
  repo: string;
  tags: string[];
  /** Digest dell'immagine (sha256, 64 caratteri esadecimali): i primi 12 sono l'IMAGE ID. */
  id: string;
  digest: string;
  layers: string[];
  diskUsage: string;
  contentSize: string;
  /** Comando predefinito (ENTRYPOINT + CMD) come lo mostra `docker ps`. */
  defaultCommand: string[];
  exposedPorts: string[];
  /** true se il processo principale si ferma bene con SIGTERM (`docker stop` → Exited (0)). */
  handlesSigterm: boolean;
  /** Contenuto di /etc/os-release dentro il container. */
  osRelease: string;
  /** Esecuzione del comando predefinito. */
  runDefault: (env: Record<string, string>, now: number) => ProgramResult;
}

const hex = (seed: string, length: number) => {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  let out = '';
  while (out.length < length) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out += state.toString(16).padStart(8, '0');
  }
  return out.slice(0, length);
};

function nginxTime(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

const DEBIAN_OS = `PRETTY_NAME="Debian GNU/Linux 13 (trixie)"
NAME="Debian GNU/Linux"
VERSION_ID="13"
VERSION="13 (trixie)"
VERSION_CODENAME=trixie
ID=debian
HOME_URL="https://www.debian.org/"
`;

const HELLO_WORLD = [
  '',
  'Hello from Docker!',
  'This message shows that your installation appears to be working correctly.',
  '',
  'To generate this message, Docker took the following steps:',
  ' 1. The Docker client contacted the Docker daemon.',
  ' 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.',
  '    (amd64)',
  ' 3. The Docker daemon created a new container from that image which runs the',
  '    executable that produces the output you are currently reading.',
  ' 4. The Docker daemon streamed that output to the Docker client, which sent it',
  '    to your terminal.',
  '',
  'To try something more ambitious, you can run an Ubuntu container with:',
  ' $ docker run -it ubuntu bash',
  '',
  'Share images, automate workflows, and more with a free Docker ID:',
  ' https://hub.docker.com/',
  '',
  'For more examples and ideas, visit:',
  ' https://docs.docker.com/get-started/',
  '',
];

function image(
  repo: string,
  rest: Omit<CatalogImage, 'repo' | 'id' | 'digest' | 'layers'> & { layerCount: number },
): CatalogImage {
  const { layerCount, ...data } = rest;
  return {
    repo,
    id: hex(`${repo}-id`, 64),
    digest: hex(`${repo}-digest`, 64),
    layers: Array.from({ length: layerCount }, (_, i) => hex(`${repo}-layer-${i}`, 12)),
    ...data,
  };
}

export const CATALOG: Record<string, CatalogImage> = {
  'hello-world': image('hello-world', {
    tags: ['latest', 'linux'],
    layerCount: 1,
    diskUsage: '20.3kB',
    contentSize: '3.96kB',
    defaultCommand: ['/hello'],
    exposedPorts: [],
    handlesSigterm: true,
    osRelease: '',
    runDefault: () => ({ kind: 'exit', stdout: HELLO_WORLD, code: 0 }),
  }),
  nginx: image('nginx', {
    tags: ['latest', 'stable', 'alpine', '1.29', '1.28'],
    layerCount: 7,
    diskUsage: '225MB',
    contentSize: '59.8MB',
    defaultCommand: ['/docker-entrypoint.sh', 'nginx', '-g', "'daemon off;'"],
    exposedPorts: ['80/tcp'],
    handlesSigterm: true,
    osRelease: DEBIAN_OS,
    runDefault: (_env, now) => ({
      kind: 'service',
      code: 0,
      stdout: [
        '/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration',
        '/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/',
        '/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh',
        '10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf',
        '10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf',
        '/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh',
        '/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh',
        '/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh',
        '/docker-entrypoint.sh: Configuration complete; ready for start up',
        `${nginxTime(now)} [notice] 1#1: using the "epoll" event method`,
        `${nginxTime(now)} [notice] 1#1: start worker processes`,
      ],
    }),
  }),
  alpine: image('alpine', {
    tags: ['latest', '3.22', '3.21'],
    layerCount: 1,
    diskUsage: '13.1MB',
    contentSize: '3.8MB',
    defaultCommand: ['/bin/sh'],
    exposedPorts: [],
    handlesSigterm: false,
    osRelease: `NAME="Alpine Linux"
ID=alpine
VERSION_ID=3.22.2
PRETTY_NAME="Alpine Linux v3.22"
HOME_URL="https://alpinelinux.org/"
`,
    runDefault: () => ({ kind: 'interactive', stdout: [], code: 0 }),
  }),
  ubuntu: image('ubuntu', {
    tags: ['latest', '24.04', 'noble', '22.04', 'jammy'],
    layerCount: 1,
    diskUsage: '117MB',
    contentSize: '29.7MB',
    defaultCommand: ['/bin/bash'],
    exposedPorts: [],
    handlesSigterm: false,
    osRelease: `PRETTY_NAME="Ubuntu 24.04.3 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04.3 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
`,
    runDefault: () => ({ kind: 'interactive', stdout: [], code: 0 }),
  }),
  postgres: image('postgres', {
    tags: ['latest', '18', '17', '16', 'alpine'],
    layerCount: 13,
    diskUsage: '641MB',
    contentSize: '158MB',
    defaultCommand: ['docker-entrypoint.sh', 'postgres'],
    exposedPorts: ['5432/tcp'],
    handlesSigterm: true,
    osRelease: DEBIAN_OS,
    runDefault: (env) => {
      if (!env.POSTGRES_PASSWORD && env.POSTGRES_HOST_AUTH_METHOD !== 'trust') {
        return {
          kind: 'exit',
          code: 1,
          stdout: [],
          stderr: [
            'Error: Database is uninitialized and superuser password is not specified.',
            '       You must specify POSTGRES_PASSWORD to a non-empty value for the',
            '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".',
            '',
            '       You may also use "POSTGRES_HOST_AUTH_METHOD=trust" to allow all',
            '       connections without a password. This is *not* recommended.',
            '',
            '       See PostgreSQL documentation about "trust":',
            '       https://www.postgresql.org/docs/current/auth-trust.html',
          ],
        };
      }
      return {
        kind: 'service',
        code: 0,
        stdout: [
          'The files belonging to this database system will be owned by user "postgres".',
          'This user must also own the server process.',
          '',
          'Success. You can now start the database server using:',
          '',
          'PostgreSQL init process complete; ready for start up.',
          '',
          'LOG:  database system is ready to accept connections',
        ],
      };
    },
  }),
  redis: image('redis', {
    tags: ['latest', '8', 'alpine'],
    layerCount: 8,
    diskUsage: '200MB',
    contentSize: '52.6MB',
    defaultCommand: ['docker-entrypoint.sh', 'redis-server'],
    exposedPorts: ['6379/tcp'],
    handlesSigterm: true,
    osRelease: DEBIAN_OS,
    runDefault: () => ({
      kind: 'service',
      code: 0,
      stdout: [
        '1:C * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo',
        '1:M * Server initialized',
        '1:M * Ready to accept connections tcp',
      ],
    }),
  }),
};

/** "nginx" → { repo: "nginx", tag: "latest" }; accetta anche "library/nginx" e "docker.io/library/nginx". */
export function parseImageRef(ref: string): { repo: string; tag: string } {
  const withoutRegistry = ref.replace(/^docker\.io\//, '').replace(/^library\//, '');
  const colon = withoutRegistry.lastIndexOf(':');
  if (colon > 0 && !withoutRegistry.slice(colon).includes('/')) {
    return { repo: withoutRegistry.slice(0, colon), tag: withoutRegistry.slice(colon + 1) };
  }
  return { repo: withoutRegistry, tag: 'latest' };
}

export { hex as pseudoHex };
