import { err, ok, type Result } from './result.js';
import { domainError, type DomainError } from './errors.js';

/**
 * Generic dependency-graph utilities used by the Process model (docs/contracts/process.md, D3).
 * A node lists the ids it depends on (finish-to-start). Time scheduling lives elsewhere.
 */
export interface GraphNode<Id extends string = string> {
  readonly id: Id;
  readonly dependsOn: readonly Id[];
}

export type GraphError<Id extends string = string> =
  | DomainError<'DuplicateNodeId', { id: Id }>
  | DomainError<'UnknownDependency', { id: Id; dependsOn: Id }>
  | DomainError<'SelfDependency', { id: Id }>
  | DomainError<'DependencyCycle', { cycle: Id[] }>;

/** Checks ids are unique, references exist and no node depends on itself. */
export const validateReferences = <Id extends string>(
  nodes: readonly GraphNode<Id>[],
): Result<void, GraphError<Id>> => {
  const ids = new Set<Id>();
  for (const node of nodes) {
    if (ids.has(node.id)) {
      return err(domainError('DuplicateNodeId', `Duplicate id ${node.id}`, { id: node.id }));
    }
    ids.add(node.id);
  }
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (dep === node.id) {
        return err(domainError('SelfDependency', `${node.id} depends on itself`, { id: node.id }));
      }
      if (!ids.has(dep)) {
        return err(
          domainError('UnknownDependency', `${node.id} depends on unknown ${dep}`, {
            id: node.id,
            dependsOn: dep,
          }),
        );
      }
    }
  }
  return ok(undefined);
};

/**
 * Deterministic topological order: among ready nodes, the one appearing first in the input wins.
 * An input that is already a valid order is therefore returned unchanged.
 */
export const topologicalSort = <Id extends string>(
  nodes: readonly GraphNode<Id>[],
): Result<Id[], GraphError<Id>> => {
  const valid = validateReferences(nodes);
  if (!valid.ok) return valid;

  const remaining = new Map<Id, number>();
  const dependents = new Map<Id, Id[]>();
  for (const node of nodes) {
    remaining.set(node.id, new Set(node.dependsOn).size);
    for (const dep of new Set(node.dependsOn)) {
      dependents.set(dep, [...(dependents.get(dep) ?? []), node.id]);
    }
  }

  const position = new Map(nodes.map((node, index) => [node.id, index]));
  const ready = nodes.filter((node) => remaining.get(node.id) === 0).map((node) => node.id);
  const order: Id[] = [];

  while (ready.length > 0) {
    ready.sort((a, b) => (position.get(a) ?? 0) - (position.get(b) ?? 0));
    const id = ready.shift() as Id;
    order.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      const left = (remaining.get(dependent) ?? 0) - 1;
      remaining.set(dependent, left);
      if (left === 0) ready.push(dependent);
    }
  }

  if (order.length < nodes.length) {
    const cycle = findCycle(nodes.filter((node) => (remaining.get(node.id) ?? 0) > 0));
    return err(
      domainError('DependencyCycle', `Dependency cycle: ${cycle.join(' -> ')}`, { cycle }),
    );
  }
  return ok(order);
};

/** True when every node appears after all of its dependencies (the mobile-list rule of D3). */
export const isTopologicalOrder = <Id extends string>(nodes: readonly GraphNode<Id>[]): boolean => {
  const seen = new Set<Id>();
  for (const node of nodes) {
    if (!node.dependsOn.every((dep) => seen.has(dep))) return false;
    seen.add(node.id);
  }
  return true;
};

/** Returns one cycle among nodes known to contain at least one, as [a, b, ..., a]. */
const findCycle = <Id extends string>(nodes: readonly GraphNode<Id>[]): Id[] => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const state = new Map<Id, 'visiting' | 'done'>();
  const stack: Id[] = [];

  const visit = (id: Id): Id[] | undefined => {
    state.set(id, 'visiting');
    stack.push(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(dep)) continue;
      if (state.get(dep) === 'visiting') return [...stack.slice(stack.indexOf(dep)), dep];
      if (state.get(dep) === undefined) {
        const found = visit(dep);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(id, 'done');
    return undefined;
  };

  for (const node of nodes) {
    if (state.get(node.id) === undefined) {
      const found = visit(node.id);
      if (found) return found;
    }
  }
  return [];
};
