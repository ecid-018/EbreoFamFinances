import { describe, it, expect } from 'vitest';
import { getAccountLabel, getAccountLabelById } from './accounts.js';

// Invented. The shape that matters: two accounts with the same name, one each.
const accounts = [
  { id: 'a1', name: 'Test BPI Savings', ownerId: 'u1' },
  { id: 'a2', name: 'Test BPI Savings', ownerId: 'u2' },
  { id: 'a3', name: 'Test Metrobank', ownerId: 'u1' },
];
const profiles = [
  { id: 'u1', displayName: 'Test One' },
  { id: 'u2', displayName: 'Test Two' },
];

describe('getAccountLabel', () => {
  it('names the owner when two accounts share a name', () => {
    expect(getAccountLabel(accounts[0], accounts, profiles)).toBe('Test BPI Savings (Test One)');
    expect(getAccountLabel(accounts[1], accounts, profiles)).toBe('Test BPI Savings (Test Two)');
  });

  // Adding an owner to every row would be noise.
  it('leaves a unique name alone', () => {
    expect(getAccountLabel(accounts[2], accounts, profiles)).toBe('Test Metrobank');
  });

  it('falls back to the bare name when the owner is unknown', () => {
    expect(getAccountLabel(accounts[0], accounts, [])).toBe('Test BPI Savings');
  });

  it('survives a missing account', () => {
    expect(getAccountLabel(null, accounts, profiles)).toBe('an account');
    expect(getAccountLabelById('nope', accounts, profiles)).toBe('an account');
  });

  it('works from an id', () => {
    expect(getAccountLabelById('a2', accounts, profiles)).toBe('Test BPI Savings (Test Two)');
  });

  it('survives being given nothing at all', () => {
    expect(getAccountLabel(accounts[0])).toBe('Test BPI Savings');
  });
});
