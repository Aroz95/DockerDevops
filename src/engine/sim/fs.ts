import { basename, dirname } from './path';

interface NodeBase {
  mtime: number;
  owner: string;
  group: string;
  /** Permessi in ottale, come chmod: 0o755, 0o644, 0o1777 (con sticky bit)… */
  mode: number;
}

export interface DirNode extends NodeBase {
  type: 'dir';
  children: Map<string, FsNode>;
}

export interface FileNode extends NodeBase {
  type: 'file';
  content: string;
}

export type FsNode = DirNode | FileNode;

export type FsError = 'missing' | 'exists' | 'notDir' | 'isDir' | 'notEmpty' | 'noParent' | 'denied';

export type Permission = 'r' | 'w' | 'x';

/** Chi sta agendo: nome utente e gruppi a cui appartiene. */
export interface Actor {
  user: string;
  groups: readonly string[];
}

export const ROOT: Actor = { user: 'root', groups: ['root'] };

const BITS: Record<Permission, number> = { r: 4, w: 2, x: 1 };
const STICKY = 0o1000;

/**
 * Il controllo dei permessi di Linux: si guarda la terna del proprietario, altrimenti
 * quella del gruppo, altrimenti quella degli altri. L'utente root supera ogni controllo,
 * tranne l'esecuzione di un file senza nessun permesso x.
 */
export function allowed(node: FsNode, actor: Actor, permission: Permission): boolean {
  const bit = BITS[permission];
  if (actor.user === 'root') {
    return permission !== 'x' || node.type === 'dir' || (node.mode & 0o111) !== 0;
  }
  if (node.owner === actor.user) return ((node.mode >> 6) & bit) !== 0;
  if (actor.groups.includes(node.group)) return ((node.mode >> 3) & bit) !== 0;
  return (node.mode & bit) !== 0;
}

/** Permessi come li mostra `ls -l`: drwxr-xr-x, -rw-r--r--, drwxrwxrwt… */
export function modeString(node: FsNode): string {
  const triplet = (value: number) =>
    `${value & 4 ? 'r' : '-'}${value & 2 ? 'w' : '-'}${value & 1 ? 'x' : '-'}`;
  let text = `${node.type === 'dir' ? 'd' : '-'}${triplet(node.mode >> 6)}${triplet(node.mode >> 3)}${triplet(node.mode)}`;
  if (node.mode & STICKY) text = text.slice(0, 9) + (node.mode & 1 ? 't' : 'T');
  return text;
}

/**
 * File system in memoria, con proprietari e permessi.
 * Tutti i percorsi passati qui sono assoluti e normalizzati.
 * Ogni operazione controlla i permessi di chi agisce (`actor`): l'utente normale riceve
 * "Permission denied" dove lo riceverebbe su un vero Linux.
 */
export class VirtualFs {
  readonly root: DirNode;
  /** Chi sta agendo in questo momento (cambia per la durata di un `sudo`). */
  actor: Actor = ROOT;

  constructor(private readonly now: () => number) {
    this.root = { type: 'dir', children: new Map(), mtime: now(), owner: 'root', group: 'root', mode: 0o755 };
  }

  /** Il nodo a quel percorso, senza controlli di permesso (per uso interno e per gli obiettivi). */
  get(path: string): FsNode | undefined {
    let node: FsNode = this.root;
    for (const part of path.split('/').filter(Boolean)) {
      if (node.type !== 'dir') return undefined;
      const child = node.children.get(part);
      if (!child) return undefined;
      node = child;
    }
    return node;
  }

  /**
   * Il nodo a quel percorso come lo vede chi agisce: per attraversare una cartella
   * serve il permesso x su di essa (per esempio /root è chiusa agli altri utenti).
   */
  lookup(path: string): { node?: FsNode; error?: FsError } {
    let node: FsNode = this.root;
    for (const part of path.split('/').filter(Boolean)) {
      if (node.type !== 'dir') return { error: 'notDir' };
      if (!allowed(node, this.actor, 'x')) return { error: 'denied' };
      const child = node.children.get(part);
      if (!child) return { error: 'missing' };
      node = child;
    }
    return { node };
  }

  isDir(path: string): boolean {
    return this.get(path)?.type === 'dir';
  }

  can(node: FsNode, permission: Permission): boolean {
    return allowed(node, this.actor, permission);
  }

  /** La cartella che conterrà `path`, se chi agisce può crearci o cancellarci dentro. */
  private writableParent(path: string): DirNode | FsError {
    const { node: parent, error } = this.lookup(dirname(path));
    if (error) return error === 'missing' ? 'noParent' : error;
    if (!parent || parent.type !== 'dir') return 'notDir';
    if (!allowed(parent, this.actor, 'w') || !allowed(parent, this.actor, 'x')) return 'denied';
    return parent;
  }

  private newNode<T extends 'file' | 'dir'>(type: T): T extends 'dir' ? DirNode : FileNode {
    const base = { mtime: this.now(), owner: this.actor.user, group: this.actor.groups[0] ?? this.actor.user };
    return (
      type === 'dir'
        ? { ...base, type: 'dir', children: new Map(), mode: 0o755 }
        : { ...base, type: 'file', content: '', mode: 0o644 }
    ) as T extends 'dir' ? DirNode : FileNode;
  }

  mkdir(path: string, parents = false): FsError | null {
    if (path === '/') return parents ? null : 'exists';
    const existing = this.get(path);
    if (existing) return parents && existing.type === 'dir' ? null : 'exists';
    if (parents && !this.get(dirname(path))) {
      const error = this.mkdir(dirname(path), true);
      if (error) return error;
    }
    const parent = this.writableParent(path);
    if (typeof parent === 'string') return parent;
    parent.children.set(basename(path), this.newNode('dir'));
    parent.mtime = this.now();
    return null;
  }

  writeFile(path: string, content: string, append = false): FsError | null {
    if (path === '/dev/null') return null; // tutto ciò che si scrive qui viene buttato via
    const { node: existing, error } = this.lookup(path);
    if (error === 'denied' || error === 'notDir') return error;
    if (existing?.type === 'dir') return 'isDir';
    if (existing) {
      if (!allowed(existing, this.actor, 'w')) return 'denied';
      existing.content = append ? existing.content + content : content;
      existing.mtime = this.now();
      return null;
    }
    const parent = this.writableParent(path);
    if (typeof parent === 'string') return parent;
    const file = this.newNode('file');
    file.content = content;
    parent.children.set(basename(path), file);
    parent.mtime = this.now();
    return null;
  }

  /** Crea un file vuoto o aggiorna la data di uno esistente. */
  touch(path: string): FsError | null {
    const { node: existing, error } = this.lookup(path);
    if (error === 'denied') return error;
    if (existing) {
      if (existing.owner !== this.actor.user && !allowed(existing, this.actor, 'w')) return 'denied';
      existing.mtime = this.now();
      return null;
    }
    return this.writeFile(path, '');
  }

  /** Legge un file controllando i permessi. */
  read(path: string): { content?: string; error?: FsError } {
    const { node, error } = this.lookup(path);
    if (error) return { error };
    if (!node) return { error: 'missing' };
    if (node.type === 'dir') return { error: 'isDir' };
    if (!allowed(node, this.actor, 'r')) return { error: 'denied' };
    return { content: path === '/dev/null' ? '' : node.content };
  }

  /** Controlla che chi agisce possa togliere `path` dalla sua cartella (sticky bit compreso). */
  private removable(path: string): { parent?: DirNode; node?: FsNode; error?: FsError } {
    const { node, error } = this.lookup(path);
    if (error) return { error };
    if (!node || path === '/') return { error: 'missing' };
    const parent = this.writableParent(path);
    if (typeof parent === 'string') return { error: parent };
    if (parent.mode & STICKY && this.actor.user !== 'root' && node.owner !== this.actor.user && parent.owner !== this.actor.user) {
      return { error: 'denied' };
    }
    return { parent, node };
  }

  remove(path: string, recursive = false): FsError | null {
    const { parent, node, error } = this.removable(path);
    if (error || !parent || !node) return error ?? 'missing';
    if (node.type === 'dir' && !recursive) return 'isDir';
    parent.children.delete(basename(path));
    parent.mtime = this.now();
    return null;
  }

  removeEmptyDir(path: string): FsError | null {
    const node = this.get(path);
    if (!node) return 'missing';
    if (node.type !== 'dir') return 'notDir';
    if (node.children.size > 0) return 'notEmpty';
    return this.remove(path, true);
  }

  /** Nomi contenuti in una cartella, in ordine alfabetico (come `ls`). */
  list(path: string): string[] {
    const node = this.get(path);
    if (node?.type !== 'dir') return [];
    return [...node.children.keys()].sort((a, b) =>
      a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''), 'en'),
    );
  }

  /** Copia profonda di un nodo (per `cp -r`): la copia appartiene a chi la fa. */
  clone(node: FsNode): FsNode {
    const owner = { owner: this.actor.user, group: this.actor.groups[0] ?? this.actor.user };
    if (node.type === 'file') return { ...node, ...owner, mtime: this.now() };
    return {
      ...node,
      ...owner,
      mtime: this.now(),
      children: new Map([...node.children].map(([name, child]) => [name, this.clone(child)])),
    };
  }

  /** Inserisce un nodo già pronto in un percorso (per `cp` e `mv`). */
  place(path: string, node: FsNode): FsError | null {
    const existing = this.get(path);
    if (existing && !allowed(existing, this.actor, 'w') && existing.type === 'file') return 'denied';
    const parent = this.writableParent(path);
    if (typeof parent === 'string') return parent;
    parent.children.set(basename(path), node);
    parent.mtime = this.now();
    return null;
  }

  /** Cambia i permessi (solo il proprietario o root possono farlo). */
  chmod(path: string, mode: (current: number, isDir: boolean) => number): FsError | 'notOwner' | null {
    const { node, error } = this.lookup(path);
    if (error) return error;
    if (!node) return 'missing';
    if (this.actor.user !== 'root' && node.owner !== this.actor.user) return 'notOwner';
    node.mode = mode(node.mode, node.type === 'dir') & 0o7777;
    return null;
  }

  /** Cambia proprietario e gruppo (solo root). */
  chown(path: string, owner: string | undefined, group: string | undefined): FsError | 'notOwner' | null {
    const { node, error } = this.lookup(path);
    if (error) return error;
    if (!node) return 'missing';
    if (this.actor.user !== 'root') return 'notOwner';
    if (owner) node.owner = owner;
    if (group) node.group = group;
    return null;
  }
}
