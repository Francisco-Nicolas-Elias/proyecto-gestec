# Resiliencia — Especificación (delta): fallo parcial de carga en Dashboard

## Purpose

Define que el Dashboard debe distinguir entre "no hay datos pendientes" y "falló la carga de datos", para evitar que el equipo de IT interprete una falla técnica como ausencia real de trabajo pendiente.

---

## Requirements

### Requirement: Aviso visible ante fallo parcial de carga

Si alguna de las queries que componen el Dashboard (`getActivos`, `getTickets`, `getTareas`, `getStock`, `getLogs`) falla, el sistema MUST mostrar un aviso visible al usuario (toast de error), y MUST NOT mostrar los KPIs de las secciones que sí cargaron correctamente como si fueran 0/vacíos junto a las que fallaron sin distinción.

#### Scenario: Una query falla, el resto carga bien

- GIVEN que `getStock()` falla por un timeout transitorio, pero `getActivos()`, `getTickets()` y `getTareas()` responden correctamente
- WHEN el Dashboard termina de cargar
- THEN los KPIs de Activos, Tickets y Tareas MUST mostrar sus valores reales
- AND el sistema MUST mostrar un aviso indicando que la carga de Stock falló, no un KPI de stock en 0

#### Scenario: Todas las queries cargan bien

- GIVEN que las 4 queries responden correctamente
- WHEN el Dashboard termina de cargar
- THEN el comportamiento MUST ser idéntico al actual, sin ningún aviso adicional
