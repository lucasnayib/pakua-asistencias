# Operaciones — Pakua Asistencias

Guía corta para quien administre el servidor día a día (no hace falta saber programar).

## El servidor corre solo (PM2)

La app corre bajo [PM2](https://pm2.keymetrics.io/), un administrador de procesos que:

- La reinicia sola si se cae.
- La vuelve a levantar automáticamente si Windows se reinicia (tarea programada
  "PakuaServidorInicio", corre como SYSTEM, no hace falta que nadie inicie sesión).

Por eso, en uso normal **no hace falta abrir `iniciar-servidor.bat`** — eso queda solo
como método manual de respaldo (por ejemplo, para probar algo puntual en primer plano).

Windows en esta máquina está configurado para no suspenderse ni hibernar mientras esté
conectada a corriente, así el servidor queda arriba 24/7.

### Ver el estado del servidor

Desde la carpeta del proyecto:

```
pm2 status
```

### Ver los logs (para diagnosticar un problema)

```
pm2 logs pakua-asistencias
```

(Ctrl+C para salir de la vista en vivo.)

### Reiniciar el servidor a mano

```
pm2 restart pakua-asistencias
```

### Después de instalar una actualización de código

Hay que reconstruir la app y reiniciar el proceso:

```
npm run build
pm2 restart pakua-asistencias
```

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

1. **Apagar el servidor**: `pm2 stop pakua-asistencias`.
2. Hacer una copia del `dev.db` actual por las dudas (por si el backup elegido resulta no ser el correcto).
3. Copiar el archivo de backup elegido (desde `storage/backups/`) sobre `dev.db`, en la raíz del proyecto, renombrándolo a `dev.db`.
4. Volver a prender el servidor: `pm2 start pakua-asistencias`.

### Qué NO cubre esto

Estos backups quedan guardados **en el mismo disco** del servidor. Si esa computadora se rompe, se pierde o se la roban, los backups se pierden con ella. Para cubrir ese caso hace falta además una copia fuera de esa máquina (por ejemplo, subiéndola a Google Drive) — todavía no está configurado; es el siguiente paso pendiente cuando se quiera cerrar ese riesgo del todo.

## Backup manual completo (todas las escuelas)

Desde el panel, con la cuenta de **super-admin**, en "Copias de seguridad" hay un botón para descargar la base completa (todas las escuelas juntas) en cualquier momento. Guardar ese archivo en un lugar seguro fuera de la computadora del servidor (ej. un pendrive, otra compu). Solo el super-admin puede hacer esto — un admin de una escuela individual no tiene acceso, porque ese archivo contiene los datos de todas las escuelas, no solo la propia.
