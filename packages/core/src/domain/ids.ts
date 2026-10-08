/**
 * Identifiers are user data used as dictionary keys. Names of built-in object members can never be
 * identifiers (formula.md, process.md), so `record[id]` always reads an own value.
 */
export const isReservedId = (id: string): boolean => id in Object.prototype || id === 'prototype';
