import { TipoMovimientoStock } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { addLogService } from './logs.service';

// Stock derivado desde Componentes (activos serializados)
export async function getStockComponentesService() {
  const grupos = await prisma.componente.groupBy({
    by: ['tipoComponenteId'],
    _count: { id: true },
  });

  const enDeposito = await prisma.componente.groupBy({
    by: ['tipoComponenteId'],
    where: { activoId: null },
    _count: { id: true },
  });

  const instalados = await prisma.componente.groupBy({
    by: ['tipoComponenteId'],
    where: { activoId: { not: null } },
    _count: { id: true },
  });

  const tipos = await prisma.tipoComponente.findMany();
  const depositoMap = Object.fromEntries(enDeposito.map((g) => [g.tipoComponenteId, g._count.id]));
  const instaladosMap = Object.fromEntries(instalados.map((g) => [g.tipoComponenteId, g._count.id]));

  return grupos.map((g) => {
    const tipo = tipos.find((t) => t.id === g.tipoComponenteId);
    const cantDeposito = depositoMap[g.tipoComponenteId] ?? 0;
    const cantInstalados = instaladosMap[g.tipoComponenteId] ?? 0;
    const total = g._count.id;

    return {
      tipoComponenteId: g.tipoComponenteId,
      nombre: tipo?.nombre ?? g.tipoComponenteId,
      total,
      enDeposito: cantDeposito,
      instalados: cantInstalados,
      estado: calcularEstado(cantDeposito),
    };
  });
}

function calcularEstado(cantidad: number): 'ok' | 'bajo' | 'critico' {
  if (cantidad <= 0) return 'critico';
  if (cantidad <= 3) return 'bajo';
  return 'ok';
}

// Stock Items (consumibles no serializados)
export async function getStockItemsService(filters?: { estado?: string }) {
  const items = await prisma.stockItem.findMany({
    include: { tipoComponente: true, proveedor: true },
    orderBy: { nombre: 'asc' },
  });

  return items
    .map((item) => ({
      ...item,
      estado: calcularEstado(item.cantidad),
    }))
    .filter((item) => !filters?.estado || item.estado === filters.estado);
}

export async function createStockMovimientoService(
  data: {
    stockItemId: string;
    tipo: TipoMovimientoStock;
    cantidad: number;
    motivo: string;
    referenciaIntervencion?: string;
  },
  usuarioId: string,
  usuarioNombre: string,
  usuarioRol: string,
) {
  const item = await prisma.stockItem.findUnique({ where: { id: data.stockItemId } });
  if (!item) throw new Error('Item de stock no encontrado');

  const movimiento = await prisma.$transaction(async (tx) => {
    const mov = await tx.stockMovimiento.create({
      data: { ...data, usuarioId },
      include: { stockItem: true },
    });

    const delta = data.tipo === 'entrada' ? data.cantidad : data.tipo === 'salida' ? -data.cantidad : 0;
    await tx.stockItem.update({
      where: { id: data.stockItemId },
      data: { cantidad: { increment: delta }, ultimaActualizacion: new Date() },
    });

    return mov;
  });

  const accion = data.tipo === 'entrada' ? 'Entrada' : data.tipo === 'salida' ? 'Salida' : 'Ajuste';
  await addLogService(
    `${accion} de stock: ${data.cantidad} unidades de "${item.nombre}"`,
    'Stock',
    usuarioNombre,
    usuarioRol,
  );

  return movimiento;
}

export async function getStockMovimientosService(stockItemId?: string) {
  return prisma.stockMovimiento.findMany({
    where: stockItemId ? { stockItemId } : undefined,
    include: { stockItem: true, usuario: { omit: { password: true } } },
    orderBy: { fecha: 'desc' },
  });
}
