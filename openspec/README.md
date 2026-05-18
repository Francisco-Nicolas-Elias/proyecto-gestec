# GESTEC — OpenSpec (SDD)

Directorio de Spec-Driven Development del proyecto GESTEC.

## Estructura del monorepo

```
proyecto-gestec/          ← raíz del monorepo
├── frontend/             ← React 18 + Vite + TypeScript (Figma Make)
├── backend/              ← Node.js + Express + TypeScript (API REST)
├── openspec/             ← SDD (este directorio)
│   ├── config.yaml       ← Configuración SDD del proyecto
│   ├── README.md         ← Este archivo
│   ├── specs/            ← Especificaciones archivadas (fuente de verdad)
│   └── changes/
│       ├── archive/      ← Changes completados y archivados
│       └── conectar-frontend-backend/   ← 🔴 ACTIVO
│           ├── proposal.md  ← Qué y por qué
│           ├── design.md    ← Cómo (endpoints, flujo, arquitectura)
│           └── tasks.md     ← Lista de tareas con estado ✅/❌
└── CLAUDE.md             ← Guía completa del proyecto
```

## Changes activos

| Change | Estado | Descripción |
|--------|--------|-------------|
| `conectar-frontend-backend` | 🔴 Pendiente | Reemplazar mock por fetch real al backend Express |

## Cómo retomar el trabajo

1. Abrir `changes/<nombre>/tasks.md` → buscar la primera tarea sin `✅`
2. Leer `changes/<nombre>/design.md` para recordar el approach técnico
3. Decirle a Claude: *"Continuemos desde la tarea X.Y del change conectar-frontend-backend"*

## Comandos SDD

```
/sdd-propose   → crear o actualizar una propuesta
/sdd-spec      → escribir specs Given/When/Then
/sdd-design    → diseño técnico
/sdd-tasks     → lista de tareas
/sdd-apply     → implementar tareas
/sdd-verify    → verificar contra specs
/sdd-archive   → archivar change completado
```
