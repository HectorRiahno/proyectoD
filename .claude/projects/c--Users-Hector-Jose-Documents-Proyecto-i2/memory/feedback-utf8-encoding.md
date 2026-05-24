---
name: feedback-utf8-encoding
description: NUNCA usar PowerShell Get-Content/Set-Content para reemplazar texto en archivos UTF-8 — corrompe a mojibake cp1252
metadata:
  type: feedback
---

Regla: **No usar PowerShell `Get-Content` / `Set-Content` para reemplazos masivos** en archivos del proyecto (UTF-8). Solo usar la herramienta `Edit` con `replace_all: true`.

**Why:** En Windows PowerShell 5.1, `Get-Content` lee archivos UTF-8 sin BOM como cp1252, lo cual transforma caracteres acentuados a mojibake al re-encodearlos. Pasó en este proyecto al hacer `(Get-Content) -replace 'Seccion','Section' | Set-Content` sobre `src/features/admin/pages/Pacientes.jsx`: caracteres como `—`, `ó`, `ñ`, `¿`, `°`, `─` quedaron como `â€"`, `Ã³`, `Ã±`, `Â¿`, etc.

**How to apply:**
- Para renombrar un símbolo en N ocurrencias: usar `Edit` con `replace_all: true`.
- Para reemplazos cross-file: usar varias llamadas `Edit` (una por archivo) — no scripts shell.
- Si urge un script: usar Python o Node con encoding explícito `utf-8`, nunca PowerShell `Get-Content`/`Set-Content`.
- Recuperación si pasa: `$bytes = ReadAllBytes; $texto = UTF8.GetString($bytes); $bytes2 = cp1252.GetBytes($texto); $original = UTF8.GetString($bytes2); WriteAllText`.
