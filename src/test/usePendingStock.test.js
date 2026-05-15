import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import usePendingStock from '../hooks/usePendingStock';

vi.mock('../firebase/config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection:      vi.fn(() => 'collection-ref'),
  doc:             vi.fn(() => 'doc-ref'),
  addDoc:          vi.fn(),
  updateDoc:       vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}));

const productoMock = {
  id: 'prod-1',
  description: 'Llave inglesa',
  sku: 'LLA-001',
  pending: 0,
};

describe('usePendingStock — submitPending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a updateDoc para actualizar las unidades pendientes', async () => {
    const { updateDoc, addDoc } = await import('firebase/firestore');
    updateDoc.mockResolvedValueOnce(undefined);
    addDoc.mockResolvedValueOnce({ id: 'notif-1' });

    const { result } = renderHook(() => usePendingStock());
    await result.current.submitPending(productoMock, 5, 'urgente', 'Juan');

    expect(updateDoc).toHaveBeenCalledTimes(1);
  });

  it('suma la cantidad al pending existente del producto', async () => {
    const { updateDoc, addDoc, doc } = await import('firebase/firestore');
    updateDoc.mockResolvedValueOnce(undefined);
    addDoc.mockResolvedValueOnce({ id: 'notif-1' });

    const productoConPending = { ...productoMock, pending: 3 };
    const { result } = renderHook(() => usePendingStock());
    await result.current.submitPending(productoConPending, 5, '', 'Ana');

    expect(updateDoc).toHaveBeenCalledWith(
      doc(),
      expect.objectContaining({ pending: 8 })
    );
  });

  it('guarda la descripcion del pending', async () => {
    const { updateDoc, addDoc, doc } = await import('firebase/firestore');
    updateDoc.mockResolvedValueOnce(undefined);
    addDoc.mockResolvedValueOnce({ id: 'notif-1' });

    const { result } = renderHook(() => usePendingStock());
    await result.current.submitPending(productoMock, 2, 'Necesario para mantenimiento', 'Pedro');

    expect(updateDoc).toHaveBeenCalledWith(
      doc(),
      expect.objectContaining({ pendingDescription: 'Necesario para mantenimiento' })
    );
  });

  it('llama a addDoc para crear la notificación', async () => {
    const { updateDoc, addDoc } = await import('firebase/firestore');
    updateDoc.mockResolvedValueOnce(undefined);
    addDoc.mockResolvedValueOnce({ id: 'notif-1' });

    const { result } = renderHook(() => usePendingStock());
    await result.current.submitPending(productoMock, 3, '', 'Luis');

    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('devuelve title y message con el nombre del producto y usuario', async () => {
    const { updateDoc, addDoc } = await import('firebase/firestore');
    updateDoc.mockResolvedValueOnce(undefined);
    addDoc.mockResolvedValueOnce({ id: 'notif-1' });

    const { result } = renderHook(() => usePendingStock());
    const { title, message } = await result.current.submitPending(productoMock, 4, '', 'Carlos');

    expect(title).toBe('Nueva solicitud de material');
    expect(message).toContain('Carlos');
    expect(message).toContain('Llave inglesa');
    expect(message).toContain('4');
  });

  it('lanza el error si updateDoc falla', async () => {
    const { updateDoc } = await import('firebase/firestore');
    updateDoc.mockRejectedValueOnce(new Error('Firestore no disponible'));

    const { result } = renderHook(() => usePendingStock());
    await expect(result.current.submitPending(productoMock, 2, '', 'Maria'))
      .rejects.toThrow('Firestore no disponible');
  });
});
