-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('administrador', 'operaciones', 'docente_empleado');

-- CreateEnum
CREATE TYPE "EstadoActivo" AS ENUM ('activa', 'inactiva');

-- CreateEnum
CREATE TYPE "AccionComponente" AS ENUM ('creado', 'instalado', 'removido', 'transferido');

-- CreateEnum
CREATE TYPE "PrioridadTicket" AS ENUM ('baja', 'media', 'alta', 'urgente');

-- CreateEnum
CREATE TYPE "EstadoTicket" AS ENUM ('nuevo', 'en_progreso', 'resuelto');

-- CreateEnum
CREATE TYPE "PrioridadTarea" AS ENUM ('baja', 'media', 'alta');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'en_curso', 'finalizada');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('entrada', 'salida', 'ajuste');

-- CreateEnum
CREATE TYPE "TipoAdjunto" AS ENUM ('imagen', 'video', 'audio');

-- CreateEnum
CREATE TYPE "ModuloLog" AS ENUM ('Equipos', 'Tickets', 'Stock', 'Tareas', 'Administracion', 'Sistema');

-- CreateTable
CREATE TABLE "tipos_componente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipos_componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "piso" TEXT NOT NULL,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "area" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activos" (
    "id" TEXT NOT NULL,
    "nroPc" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "oficina" TEXT NOT NULL DEFAULT '',
    "usuarioAsignado" TEXT NOT NULL DEFAULT '',
    "microModelo" TEXT NOT NULL DEFAULT '',
    "microMarca" TEXT NOT NULL DEFAULT '',
    "microNroSerie" TEXT NOT NULL DEFAULT '',
    "ramTotal" TEXT NOT NULL DEFAULT '',
    "almacenamientoTotal" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "mac" TEXT NOT NULL DEFAULT '',
    "idAD" TEXT NOT NULL DEFAULT '',
    "pAD" TEXT NOT NULL DEFAULT '',
    "sistemaOperativo" TEXT NOT NULL DEFAULT '',
    "impresoraModelo" TEXT NOT NULL DEFAULT '',
    "impresoraMarca" TEXT NOT NULL DEFAULT '',
    "impresoraNroSerie" TEXT NOT NULL DEFAULT '',
    "observaciones" TEXT NOT NULL DEFAULT '',
    "fechaCambioPC" TIMESTAMP(3),
    "fechaUltimoMantenimiento" TIMESTAMP(3),
    "estado" "EstadoActivo" NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "componentes" (
    "id" TEXT NOT NULL,
    "idManual" TEXT NOT NULL,
    "tipoComponenteId" TEXT NOT NULL,
    "marcaId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "capacidad" TEXT,
    "proveedorId" TEXT,
    "activoId" TEXT,
    "responsable" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "componentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_movimientos_componente" (
    "id" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "activoId" TEXT,
    "activoCodigo" TEXT,
    "activoNombre" TEXT,
    "accion" "AccionComponente" NOT NULL,
    "ubicacionOrigen" TEXT,
    "ubicacionDestino" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "responsable" TEXT NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "historial_movimientos_componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimiento_records" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tecnico" TEXT NOT NULL,

    CONSTRAINT "mantenimiento_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervenciones" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "tecnico" TEXT NOT NULL,
    "tiempoEstimado" INTEGER,
    "tiempoReal" INTEGER,
    "resultado" TEXT NOT NULL,
    "comentarios" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervenciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repuestos_intervencion" (
    "id" TEXT NOT NULL,
    "intervencionId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "repuestos_intervencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "titulo" TEXT,
    "creadorId" TEXT NOT NULL,
    "activoId" TEXT,
    "ubicacion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "PrioridadTicket",
    "estado" "EstadoTicket" NOT NULL DEFAULT 'nuevo',
    "asignadoId" TEXT,
    "tipo" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_ticket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texto" TEXT NOT NULL,
    "esInterno" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "comentarios_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'media',
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "fechaLimite" TIMESTAMP(3),
    "ubicacionTexto" TEXT,
    "activoId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "finalizadoPorId" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaInicio" TIMESTAMP(3),
    "fechaFinalizacion" TIMESTAMP(3),

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_asignados" (
    "tareaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "tareas_asignados_pkey" PRIMARY KEY ("tareaId","usuarioId")
);

-- CreateTable
CREATE TABLE "tareas_historial" (
    "id" TEXT NOT NULL,
    "tareaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accion" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,

    CONSTRAINT "tareas_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_tarea" (
    "id" TEXT NOT NULL,
    "tareaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texto" TEXT NOT NULL,

    CONSTRAINT "comentarios_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjuntos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoAdjunto" NOT NULL,
    "url" TEXT NOT NULL,
    "tamano" TEXT NOT NULL,
    "ticketId" TEXT,
    "comentarioTicketId" TEXT,
    "tareaId" TEXT,
    "comentarioTareaId" TEXT,

    CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoComponenteId" TEXT,
    "proveedorId" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "minimoRequerido" INTEGER NOT NULL DEFAULT 1,
    "ubicacion" TEXT NOT NULL DEFAULT 'Depósito IT',
    "ultimaActualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movimientos" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "referenciaIntervencion" TEXT,

    CONSTRAINT "stock_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "info_operaciones" (
    "id" TEXT NOT NULL DEFAULT 'config',
    "telefono" TEXT NOT NULL,
    "telefonoInterno" TEXT NOT NULL,
    "horariosAtencion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "info_operaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "info_operaciones_emails" (
    "id" TEXT NOT NULL,
    "infoOperacionesId" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "info_operaciones_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "modulo" "ModuloLog" NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "usuarioRol" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_componente_nombre_key" ON "tipos_componente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_sector_key" ON "ubicaciones"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "activos_nroPc_key" ON "activos"("nroPc");

-- CreateIndex
CREATE UNIQUE INDEX "componentes_idManual_key" ON "componentes"("idManual");

-- CreateIndex
CREATE UNIQUE INDEX "componentes_numeroSerie_key" ON "componentes"("numeroSerie");

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_tipoComponenteId_fkey" FOREIGN KEY ("tipoComponenteId") REFERENCES "tipos_componente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_componente" ADD CONSTRAINT "historial_movimientos_componente_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "componentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimiento_records" ADD CONSTRAINT "mantenimiento_records_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervenciones" ADD CONSTRAINT "intervenciones_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repuestos_intervencion" ADD CONSTRAINT "repuestos_intervencion_intervencionId_fkey" FOREIGN KEY ("intervencionId") REFERENCES "intervenciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_ticket" ADD CONSTRAINT "comentarios_ticket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_ticket" ADD CONSTRAINT "comentarios_ticket_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_finalizadoPorId_fkey" FOREIGN KEY ("finalizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_asignados" ADD CONSTRAINT "tareas_asignados_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_asignados" ADD CONSTRAINT "tareas_asignados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_historial" ADD CONSTRAINT "tareas_historial_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_tarea" ADD CONSTRAINT "comentarios_tarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_tarea" ADD CONSTRAINT "comentarios_tarea_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_comentarioTicketId_fkey" FOREIGN KEY ("comentarioTicketId") REFERENCES "comentarios_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_comentarioTareaId_fkey" FOREIGN KEY ("comentarioTareaId") REFERENCES "comentarios_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_tipoComponenteId_fkey" FOREIGN KEY ("tipoComponenteId") REFERENCES "tipos_componente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movimientos" ADD CONSTRAINT "stock_movimientos_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movimientos" ADD CONSTRAINT "stock_movimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_operaciones_emails" ADD CONSTRAINT "info_operaciones_emails_infoOperacionesId_fkey" FOREIGN KEY ("infoOperacionesId") REFERENCES "info_operaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
