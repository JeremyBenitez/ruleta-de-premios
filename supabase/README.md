# Sorteo compartido de WiWU

La app desplegada en Netlify solicita el resultado a `netlify/functions/draw-prize.ts`.
Esa función invoca `draw_wiwu_prize` en Supabase. La función SQL serializa los
giros con un bloqueo transaccional y garantiza que no haya tres resultados de
susto consecutivos en el historial compartido de esta ruleta.

## Configuración

1. Crea un proyecto en Supabase.
2. En el SQL Editor de Supabase, ejecuta el contenido de
   `migrations/202610210001_shared_raffle.sql`.
3. Ejecuta también `migrations/202610220001_safe_raffle_preview.sql` en el SQL
   Editor. Esta migración agrega una prueba segura que comparte la lógica del
   sorteo sin insertar resultados ni cambiar la racha.
4. Ejecuta `migrations/202610220002_fix_shared_raffle_streak.sql` para corregir
   el control de idempotencia del sorteo.
5. En Netlify, abre **Site configuration → Environment variables** y configura:
   - `SUPABASE_URL`: URL del proyecto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` del proyecto.
6. Mantén `SUPABASE_SERVICE_ROLE_KEY` solo en Netlify. No la pongas en variables
   `VITE_*`, en el frontend ni en el repositorio.
7. Despliega la carpeta del proyecto con Netlify CLI o conecta a Netlify un
   repositorio que contenga esta app. No basta con subir solo `dist`: el
   despliegue también debe incluir `netlify/functions/draw-prize.ts`.
8. La configuración `netlify.toml` define el comando de build, `dist` como
   carpeta publicada y `netlify/functions` como carpeta de funciones.

Netlify proporciona `URL` y `DEPLOY_PRIME_URL`, que la función utiliza para
aceptar solicitudes del sitio desplegado. El modo Vite local continúa usando el
sorteo local de desarrollo.

## Probar la conexión sin sortear

Para probar Netlify Functions desde tu computadora, usa Netlify Dev (el servidor
Vite de `pnpm dev` no ejecuta funciones):

1. En la raíz del proyecto, crea un archivo local `.env` con `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY`. `.env` está ignorado por Git; no lo subas ni
   compartas su contenido.
2. Ejecuta `pnpm --package=netlify-cli dlx netlify dev`.
3. Abre `http://localhost:8888` y, en la consola del navegador de esa página,
   ejecuta:

   ```js
   fetch('/.netlify/functions/raffle-health').then(async response => ({
     status: response.status,
     body: await response.json()
   }))
   ```

Una respuesta `200` con `{ ok: true, service: "raffle" }` confirma que la
función local puede leer el estado de Supabase. Esta comprobación es de solo
lectura: no realiza sorteos ni cambia la racha compartida.

## Probar un sorteo sin registrarlo

Para probar la llamada completa de Netlify a la lógica de sorteo en Supabase,
sin registrar el resultado ni cambiar la racha, ejecuta esta consulta en la
consola del sitio publicado o en `http://localhost:8888` con Netlify Dev activo:

```js
fetch('/.netlify/functions/raffle-preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ allowAgain: true })
}).then(async response => ({
  status: response.status,
  body: await response.json()
}))
```

Una respuesta `200` incluye `dryRun: true` y el tipo de resultado simulado. La
función solo lee la racha actual; no escribe en la tabla de giros ni modifica el
contador compartido. Ejecuta primero la migración
`202610220001_safe_raffle_preview.sql` y despliega la función actualizada.

## Probabilidades

- Giro normal: 30 % premio, 10 % giro extra y 60 % susto.
- Giro extra: 10 % premio y 90 % susto.
- Tras dos sustos seguidos en cualquier dispositivo, el siguiente resultado
  está garantizado como premio o giro extra si corresponde a un giro normal;
  si es el giro extra, está garantizado como premio.

La base guarda el contador global de sustos consecutivos y un registro de cada
resultado, sin guardar datos personales. El endpoint es público para que la app
pueda jugar sin inicio de sesión; por eso no reemplaza un sistema central de
identidad o de límites de giros. Los límites diarios actuales siguen siendo
locales al dispositivo. Cada solicitud incluye un identificador para que un
reintento después de un problema de conexión no cuente como un segundo giro.
