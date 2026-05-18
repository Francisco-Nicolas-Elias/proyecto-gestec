import { prisma } from '../lib/prisma';

const SINGLETON_ID = 'config';

export async function getInfoService() {
  const info = await prisma.infoOperaciones.findUnique({
    where: { id: SINGLETON_ID },
    include: { emails: true },
  });

  if (!info) {
    // Si no existe, crear registro vacío por defecto
    return prisma.infoOperaciones.create({
      data: { id: SINGLETON_ID, telefono: '', telefonoInterno: '', horariosAtencion: '' },
      include: { emails: true },
    });
  }

  return info;
}

export async function updateInfoService(data: {
  telefono: string;
  telefonoInterno: string;
  horariosAtencion: string;
  emails: string[];
}) {
  const { emails, ...rest } = data;

  return prisma.infoOperaciones.upsert({
    where: { id: SINGLETON_ID },
    update: {
      ...rest,
      emails: {
        deleteMany: {},
        create: emails.map((email) => ({ email })),
      },
    },
    create: {
      id: SINGLETON_ID,
      ...rest,
      emails: { create: emails.map((email) => ({ email })) },
    },
    include: { emails: true },
  });
}
