# Operaciones — Pakua Asistencias

Guía corta para quien administre el servidor día a día (no hace falta saber programar).

## Backups automáticos

Todos los días a las 3:00 AM se guarda una copia de la base de datos completa en la carpeta `storage/backups/`, con nombre `pakua-backup-AAAAMMDD-HHMM.db`. Se conservan los últimos **30 días**; las copias más viejas se borran solas en cada corrida.

Cada corrida deja un renglón en `storage/backup.log` diciendo si salió bien o mal.

### Activar el backup automático (una sola vez, en el servidor)

1. Clic derecho sobre `programar-backup.bat` → **Ejecutar como administrador**.
2. Confirmar que dice "Tarea creada" al final.

### Correr un backup a mano, en cualquier momento

Desde la carpeta del proyecto:

```
npm run backup
```

### Restaurar un backup

1. **Apagar el servidor** (cerrar la ventana de `iniciar-servidor.bat`, o detener el proceso si corre con PM2).
2. Hacer una copia del `dev.db` actual por las dudas (por si el backup elegido resulta no ser el correcto).
3. Copiar el archivo de backup elegido (desde `storage/backups/`) sobre `dev.db`, en la raíz del proyecto, renombrándolo a `dev.db`.
4. Volver a prender el servidor.

### Qué NO cubre esto

Estos backups quedan guardados **en el mismo disco** del servidor. Si esa computadora se rompe, se pierde o se la roban, los backups se pierden con ella. Para cubrir ese caso hace falta además una copia fuera de esa máquina (por ejemplo, subiéndola a Google Drive) — todavía no está configurado; es el siguiente paso pendiente cuando se quiera cerrar ese riesgo del todo.

## Backup manual completo (todas las escuelas)

Desde el panel, con la cuenta de **super-admin**, en "Copias de seguridad" hay un botón para descargar la base completa (todas las escuelas juntas) en cualquier momento. Guardar ese archivo en un lugar seguro fuera de la computadora del servidor (ej. un pendrive, otra compu). Solo el super-admin puede hacer esto — un admin de una escuela individual no tiene acceso, porque ese archivo contiene los datos de todas las escuelas, no solo la propia.
