import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useProductRequestCreate from '../hooks/useProductRequestCreate';

// vi.hoisted permite usar la variable dentro del mock factory (que se eleva al tope)
const mockAuth = vi.hoisted(() => ({ currentUser: null }));

vi.mock('../firebase/config', () => ({
  db: {},
  auth: mockAuth,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'collection-ref'),
  doc:        vi.fn(() => 'doc-ref'),
  addDoc:     vi.fn(),
  getDoc:     vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}));

vi.mock('../utils/auditService', () => ({
  logAuditEvent:  vi.fn(() => Promise.resolve()),
  triggerWebhook: vi.fn(() => Promise.resolve()),
  AuditEventTypes: { REQUEST_CREATED: 'REQUEST_CREATED' },
}));

vi.mock('../utils/logger', () => ({ error: vi.fn() }));

vi.mock('../utils/securityValidation', () => ({
  isValidQuantity: (q) => Number.isInteger(Number(q)) && Number(q) > 0 && Number(q) < 1000000,
}));

const productoMock = { id: 'prod-1', description: 'Tornillo M8', sku: 'TOR-001', imageUrl: '' };

describe('useProductRequestCreate — createRequest', () => {
  beforeEach(async () => {
    mockAuth.currentUser = null;
    vi.clearAllMocks();

    // Reset individual mocks after clearAllMocks
    const firestore = await import('firebase/firestore');
    firestore.collection.mockReturnValue('collection-ref');
    firestore.doc.mockReturnValue('doc-ref');
    firestore.serverTimestamp.mockReturnValue('server-ts');
  });

  it('lanza error si el usuario no está autenticado', async () => {
    mockAuth.currentUser = null;
    const { result } = renderHook(() => useProductRequestCreate());
    await expect(result.current.createRequest(productoMock, 5))
      .rejects.toThrow('Usuario no autenticado');
  });

  it('lanza error si la cantidad es cero', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'a@b.com', displayName: 'Test' };
    const { result } = renderHook(() => useProductRequestCreate());
    await expect(result.current.createRequest(productoMock, 0))
      .rejects.toThrow('Cantidad inválida');
  });

  it('lanza error si la cantidad es negativa', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'a@b.com', displayName: 'Test' };
    const { result } = renderHook(() => useProductRequestCreate());
    await expect(result.current.createRequest(productoMock, -3))
      .rejects.toThrow('Cantidad inválida');
  });

  it('lanza error si la cantidad es decimal', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'a@b.com', displayName: 'Test' };
    const { result } = renderHook(() => useProductRequestCreate());
    await expect(result.current.createRequest(productoMock, 1.5))
      .rejects.toThrow('Cantidad inválida');
  });

  it('lanza error si el producto no existe en Firestore', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'a@b.com', displayName: 'Test' };
    const { getDoc } = await import('firebase/firestore');
    getDoc.mockResolvedValueOnce({ exists: () => false });

    const { result } = renderHook(() => useProductRequestCreate());
    await expect(result.current.createRequest(productoMock, 5))
      .rejects.toThrow('Producto no encontrado');
  });

  it('crea la solicitud y devuelve los datos correctos', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'user@test.com', displayName: 'Usuario' };
    const { getDoc, addDoc } = await import('firebase/firestore');

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ location: 'Estante A', imageUrl: 'http://img.jpg' }),
    });
    addDoc.mockResolvedValueOnce({ id: 'req-123' });

    const { result } = renderHook(() => useProductRequestCreate());
    const response = await result.current.createRequest(productoMock, 10);

    expect(response.id).toBe('req-123');
    expect(response.quantity).toBe(10);
    expect(response.status).toBe('pending');
    expect(response.userId).toBe('u1');
    expect(response.productName).toBe('Tornillo M8');
  });

  it('llama a addDoc exactamente una vez al crear', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'user@test.com', displayName: 'Usuario' };
    const { getDoc, addDoc } = await import('firebase/firestore');

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ location: 'Estante A', imageUrl: '' }),
    });
    addDoc.mockResolvedValueOnce({ id: 'req-456' });

    const { result } = renderHook(() => useProductRequestCreate());
    await result.current.createRequest(productoMock, 5);

    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('llama a logAuditEvent después de crear la solicitud', async () => {
    mockAuth.currentUser = { uid: 'u1', email: 'user@test.com', displayName: 'Usuario' };
    const { getDoc, addDoc } = await import('firebase/firestore');
    const { logAuditEvent } = await import('../utils/auditService');

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ location: 'Estante A', imageUrl: '' }),
    });
    addDoc.mockResolvedValueOnce({ id: 'req-789' });

    const { result } = renderHook(() => useProductRequestCreate());
    await result.current.createRequest(productoMock, 5);

    expect(logAuditEvent).toHaveBeenCalledTimes(1);
  });
});
