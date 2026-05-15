import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useProductRequestAdmin from '../hooks/useProductRequestAdmin';

const mockAuth = vi.hoisted(() => ({ currentUser: { uid: 'admin-1', email: 'admin@test.com' } }));

vi.mock('../firebase/config', () => ({ db: {}, auth: mockAuth }));

vi.mock('firebase/firestore', () => ({
  collection:      vi.fn(() => 'collection-ref'),
  doc:             vi.fn(() => 'doc-ref'),
  onSnapshot:      vi.fn(() => vi.fn()),
  deleteDoc:       vi.fn(),
  runTransaction:  vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}));

vi.mock('../utils/auditService', () => ({
  logAuditEvent:   vi.fn(() => Promise.resolve()),
  triggerWebhook:  vi.fn(() => Promise.resolve()),
  AuditEventTypes: { REQUEST_APPROVED: 'REQUEST_APPROVED', REQUEST_REJECTED: 'REQUEST_REJECTED' },
}));

vi.mock('../utils/logger', () => ({ error: vi.fn() }));

vi.mock('../utils/securityValidation', () => ({
  isValidQuantity: (q) => Number.isInteger(Number(q)) && Number(q) > 0 && Number(q) < 1000000,
}));

const productoDB = {
  stock: 50,
  sku: 'TOR-001',
  description: 'Tornillo M8',
  product_Unit: 'unidades',
  totalOut: 10,
};

describe('useProductRequestAdmin — deleteRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('llama a deleteDoc con el id correcto', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    deleteDoc.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProductRequestAdmin());
    await result.current.deleteRequest('req-001');

    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });

  it('lanza el error si deleteDoc falla', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    deleteDoc.mockRejectedValueOnce(new Error('Sin permisos'));

    const { result } = renderHook(() => useProductRequestAdmin());
    await expect(result.current.deleteRequest('req-001')).rejects.toThrow('Sin permisos');
  });

  it('llama a logAuditEvent después de eliminar', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    const { logAuditEvent } = await import('../utils/auditService');
    deleteDoc.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProductRequestAdmin());
    await result.current.deleteRequest('req-001');

    expect(logAuditEvent).toHaveBeenCalledTimes(1);
  });
});

describe('useProductRequestAdmin — approveRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lanza error si la cantidad es inválida', async () => {
    const { result } = renderHook(() => useProductRequestAdmin());
    await expect(result.current.approveRequest('req-1', 'prod-1', 0)).rejects.toThrow('Cantidad inválida');
    await expect(result.current.approveRequest('req-1', 'prod-1', -1)).rejects.toThrow('Cantidad inválida');
  });

  it('lanza error si el producto no existe', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => false });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useProductRequestAdmin());
    await expect(result.current.approveRequest('req-1', 'prod-1', 5)).rejects.toThrow('Producto no encontrado');
  });

  it('aprueba la solicitud y reduce el stock', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useProductRequestAdmin());
    await result.current.approveRequest('req-1', 'prod-1', 10, 'definitiva', { requestedBy: 'Juan' });

    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stock: 40 }) // 50 - 10
    );
  });

  it('marca la solicitud como approved', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useProductRequestAdmin());
    await result.current.approveRequest('req-1', 'prod-1', 5, 'definitiva', {});

    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved' })
    );
  });

  it('crea movimiento con deliveryStatus "entregado" para salida definitiva', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useProductRequestAdmin());
    await result.current.approveRequest('req-1', 'prod-1', 5, 'definitiva', {});

    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deliveryStatus: 'entregado', type: 'out' })
    );
  });

  it('crea movimiento con deliveryStatus "pendiente por devolver" para salida temporal', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useProductRequestAdmin());
    await result.current.approveRequest('req-1', 'prod-1', 5, 'pendiente', {});

    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deliveryStatus: 'pendiente por devolver' })
    );
  });

  it('devuelve true al aprobar correctamente', async () => {
    const { runTransaction } = await import('firebase/firestore');
    const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
    mockTx.get.mockResolvedValue({ exists: () => true, data: () => productoDB });
    runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const { result } = renderHook(() => useProductRequestAdmin());
    const response = await result.current.approveRequest('req-1', 'prod-1', 5, 'definitiva', {});

    expect(response).toBe(true);
  });
});

describe('useProductRequestAdmin — getRequestsByStatus', () => {
  it('filtra solicitudes por estado correctamente', async () => {
    const { onSnapshot } = await import('firebase/firestore');
    onSnapshot.mockImplementationOnce((_ref, cb) => {
      cb({
        docs: [
          { id: 'r1', data: () => ({ status: 'pending', productName: 'A' }) },
          { id: 'r2', data: () => ({ status: 'approved', productName: 'B' }) },
          { id: 'r3', data: () => ({ status: 'pending', productName: 'C' }) },
        ],
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useProductRequestAdmin());
    const pending = result.current.getRequestsByStatus('pending');
    expect(pending).toHaveLength(2);
  });
});
