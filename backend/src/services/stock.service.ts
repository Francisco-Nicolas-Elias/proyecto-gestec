import { prisma } from '../lib/prisma';

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

