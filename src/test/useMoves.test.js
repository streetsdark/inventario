import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useMoves from '../hooks/useMoves';

vi.mock('../firebase/config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection:      vi.fn(() => 'collection-ref'),
  doc:             vi.fn(() => 'doc-ref'),
  onSnapshot:      vi.fn(() => vi.fn()),  // devuelve función de unsubscribe
  orderBy:         vi.fn(),
  query:           vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
  runTransaction:  vi.fn(),
}));

vi.mock('../utils/logger', () => ({ error: vi.fn() }));

// Producto base que devuelve la "base de datos"
const productoDB = {
  stock: 50,
  pending: 5,
  sku: 'TOR-001',
  description: 'Tornillo M8',
  product_Unit: 'unidades',
  totalIn: 100,
  totalOut: 20,
  lastEntryDate: '2024-01-01',
  lastExitDate: '2024-01-15',
};

// Producto que recibe el hook desde el formulario
const productoForm = {
  id: 'prod-1',
  sku: 'TOR-001',
  description: 'Tornillo M8',
  stock: 50,
  product_Unit: 'unidades',
};

describe('useMoves — createMove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza not-found si el producto no existe', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => false });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await expect(
      result.current.createMove({ product: productoForm, quantity: 10, typeIn: true, moveDate: '2024-05-14', recipientUser: '', outputStatus: 'entregado', returnMoveId: null })
    ).rejects.toThrow('not-found');
  });

  it('lanza negative-stock si la salida deja stock negativo', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => ({ ...productoDB, stock: 5 }) });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await expect(
      result.current.createMove({ product: productoForm, quantity: 10, typeIn: false, moveDate: '2024-05-14', recipientUser: 'Juan', outputStatus: 'entregado', returnMoveId: null })
    ).rejects.toThrow('negative-stock');
  });

  it('crea un movimiento de entrada y aumenta el stock', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await result.current.createMove({ product: productoForm, quantity: 10, typeIn: true, moveDate: '2024-05-14', recipientUser: '', outputStatus: '', returnMoveId: null });

    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stock: 60 }) // 50 + 10
    );
  });

  it('crea un movimiento de salida y reduce el stock', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await result.current.createMove({ product: productoForm, quantity: 20, typeIn: false, moveDate: '2024-05-14', recipientUser: 'Ana', outputStatus: 'entregado', returnMoveId: null });

    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stock: 30 }) // 50 - 20
    );
  });

  it('devuelve currentPending del producto', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => ({ ...productoDB, pending: 8 }) });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    const response = await result.current.createMove({ product: productoForm, quantity: 5, typeIn: true, moveDate: '2024-05-14', recipientUser: '', outputStatus: '', returnMoveId: null });

    expect(response.currentPending).toBe(8);
  });

  it('guarda el movimiento con type "in" en una entrada', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await result.current.createMove({ product: productoForm, quantity: 5, typeIn: true, moveDate: '2024-05-14', recipientUser: '', outputStatus: '', returnMoveId: null });

    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'in' })
    );
  });

  it('guarda el movimiento con type "out" en una salida', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await result.current.createMove({ product: productoForm, quantity: 5, typeIn: false, moveDate: '2024-05-14', recipientUser: 'Pedro', outputStatus: 'entregado', returnMoveId: null });

    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'out', recipientUser: 'Pedro' })
    );
  });

  it('actualiza el movimiento de devolución si se pasa returnMoveId', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, id: 'prod-1', data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useMoves());
    await result.current.createMove({ product: productoForm, quantity: 5, typeIn: true, moveDate: '2024-05-14', recipientUser: '', outputStatus: '', returnMoveId: 'move-original-id' });

    // update se llama dos veces: producto + movimiento de devolución
    expect(mockTx.update).toHaveBeenCalledTimes(2);
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deliveryStatus: 'devuelto' })
    );
  });
});
