# Guía de uso para administradores y Compras

Esta guía explica cómo utilizar el dashboard privado para revisar, gestionar y dar seguimiento a las requisiciones de material gastable.

## 1. Inicio de sesión

El área administrativa sí requiere usuario y contraseña.

Para entrar:

1. Abra la pantalla de login de administración.
2. Escriba su usuario.
3. Escriba su contraseña.
4. Presione **Entrar**.

Si es un usuario nuevo o su contraseña fue restablecida, el sistema puede pedirle cambiar la contraseña al iniciar sesión. Después de cambiarla, será enviado nuevamente al login para entrar con la nueva contraseña.

## 2. Roles disponibles

El sistema maneja tres roles:

### Admin

Puede administrar la operación completa.

Puede:

- Ver el dashboard
- Ver y gestionar requisiciones
- Cambiar estados
- Registrar entregas
- Agregar comentarios
- Gestionar materiales
- Gestionar departamentos
- Gestionar usuarios
- Restablecer contraseñas
- Ver reportes y estadísticas

### Compras

Puede trabajar la operación diaria de requisiciones.

Puede:

- Ver el dashboard
- Ver y gestionar requisiciones
- Cambiar estados
- Registrar entregas
- Agregar comentarios
- Gestionar materiales
- Ver reportes y estadísticas

No puede gestionar usuarios ni departamentos.

### Supervisor

Puede consultar requisiciones de su departamento.

Puede:

- Ver el dashboard filtrado a su departamento
- Ver requisiciones de su departamento
- Ver reportes y estadísticas de su departamento

No puede cambiar estados, registrar entregas, gestionar usuarios, departamentos ni materiales.

## 3. Dashboard

El dashboard muestra un resumen general de la operación.

Puede ver indicadores como:

- Requisiciones pendientes
- En revisión
- Aprobadas
- Entregadas
- Rechazadas
- Canceladas
- Urgentes

También puede ver:

- Últimas requisiciones
- Indicadores de respuesta
- Solicitudes por estado
- Departamento con más solicitudes
- Material más utilizado
- Tendencias y estadísticas útiles

## 4. Listado de requisiciones

En **Requisiciones** puede consultar las solicitudes registradas.

Puede usar filtros como:

- Fecha
- Estado
- Código
- Departamento
- Prioridad
- Empleado
- Material

Para abrir una requisición, seleccione su código.

## 5. Detalle de requisición

En el detalle podrá ver:

- Información general de la solicitud
- Empleado solicitante
- Departamento
- Prioridad
- Estado actual
- Materiales solicitados
- Cantidades solicitadas
- Cantidades aprobadas
- Cantidades entregadas
- Historial
- Comentarios

Esta pantalla es el centro de gestión de cada requisición.

## 6. Cambiar estado

Los usuarios con rol **Admin** o **Compras** pueden cambiar el estado de una requisición.

El sistema solo permite cambios válidos según el flujo de trabajo. Por ejemplo, no se puede modificar una requisición que ya está en estado final.

Algunos cambios requieren motivo obligatorio, como:

- Rechazar una requisición
- Cancelar una requisición

Los cambios de estado quedan registrados en el historial.

## 7. Aprobar cantidades

Al aprobar una requisición, puede indicar la cantidad aprobada para cada línea.

La cantidad aprobada debe ser mayor que cero y no puede superar la cantidad solicitada.

Si no se indica una cantidad aprobada específica, el sistema toma como referencia la cantidad solicitada.

## 8. Registrar entrega

La entrega sirve para registrar cuánto se está entregando en ese momento.

Ejemplo:

- Una requisición tiene 4 unidades aprobadas.
- Se entregan 3 unidades hoy.
- El sistema deja la requisición como **Entrega parcial**.
- Luego se entrega 1 unidad adicional.
- El sistema suma esa nueva entrega y marca la requisición como **Entregada**.

El campo de entrega representa la cantidad nueva que se está entregando ahora, no el total acumulado.

No se puede entregar una cantidad mayor a la aprobada o solicitada.

## 9. Comentarios

En cada requisición puede agregar comentarios para comunicarse con el empleado.

Los comentarios se muestran en tiempo real. Esto permite conversar sobre aclaraciones, cambios o dudas sin salir de la plataforma.

## 10. Notificaciones

El sistema puede mostrar notificaciones cuando ocurre algo importante, como:

- Nueva requisición
- Cambio de estado
- Comentario nuevo
- Asignación

Si el navegador solicita permiso para mostrar notificaciones, puede aceptarlo para recibir avisos.

## 11. Materiales

En **Materiales** se gestiona el catálogo de materiales disponibles para solicitud.

Puede crear o actualizar materiales con:

- Código de artículo
- Nombre
- Descripción
- Estado disponible o no disponible para solicitud

El sistema no maneja stock ni inventario. El catálogo solo sirve para que el empleado pueda seleccionar materiales al crear requisiciones.

## 12. Departamentos

En **Departamentos** se administra el catálogo de departamentos de la empresa.

Solo el rol **Admin** puede gestionar departamentos.

Los departamentos se usan para identificar empleados, organizar requisiciones y limitar la visibilidad de los supervisores.

## 13. Usuarios

En **Usuarios internos** se administran los usuarios que pueden entrar al dashboard privado.

Solo el rol **Admin** puede gestionar usuarios.

Desde esta pantalla puede:

- Crear usuarios
- Editar usuarios
- Activar o desactivar usuarios
- Restablecer contraseñas
- Asignar roles
- Asignar departamento a supervisores

El departamento solo es obligatorio para usuarios con rol **Supervisor**.

## 14. Reportes

En **Reportes** puede consultar requisiciones y generar información para análisis.

También puede guardar una requisición en formato PDF desde el reporte.

Use esta sección para revisar solicitudes históricas, filtrar información y exportar documentos cuando sea necesario.

## 15. Buenas prácticas

- Use motivos claros al rechazar o cancelar una requisición.
- Revise las cantidades antes de aprobar o registrar entregas.
- Use comentarios para dejar evidencia de aclaraciones.
- Mantenga actualizado el catálogo de materiales.
- Desactive usuarios que ya no deban acceder al sistema.
- Asigne departamento a todo usuario Supervisor para que vea solo lo que corresponde.
