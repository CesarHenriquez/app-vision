# App de Reconocimiento Facial · EP2 Deep Learning (AVY1103)

Aplicación móvil (Android) que toma una foto a una persona de DuocUC, la convierte en una matriz de **128×128×3** y la envía a la [API de reconocimiento facial](https://github.com/CesarHenriquez/proyecto-api-vision). Muestra el **nombre de la persona** o indica que **no está en la base de datos**.

**Integrantes:** Benjamin Leal · Cesar Henriquez

## Flujo
1. **Tomar foto** (cámara) o **Galería**.
2. El usuario ajusta un cuadrado alrededor de la cara (editor de `expo-image-picker`).
3. La app recorta el cuadrado y lo redimensiona a **128×128** (`expo-image-manipulator`).
4. Envía la imagen a `POST /predecir/` como `multipart/form-data` (campo `archivo`).
5. Muestra el resultado: nombre y confianza, o "No está en la base de datos", más las 3 personas más probables.

El botón **Probar conexión** hace un `GET /` a la API para verificar que esté accesible.

## Tecnologías
- Expo SDK 58 / React Native
- `expo-image-picker`: cámara, galería y recorte manual
- `expo-image-manipulator`: recorte y redimensión a 128×128
- `XMLHttpRequest` para enviar la foto (el `fetch` de Expo SDK 58 no acepta archivos `{uri, name, type}` en `FormData`)

## Archivos principales
| Archivo | Contenido |
|---|---|
| `App.js` | Pantalla, preprocesamiento a 128×128 y comunicación con la API |
| `app.json` | Nombre de la app, paquete Android, permisos de cámara y galería, y `usesCleartextTraffic` para permitir `http://` |
| `eas.json` | Perfil `preview` de EAS Build que genera el instalable `.apk` |

## Ejecutar en desarrollo
```bash
npm install
npx expo start
```
Escanear el QR con **Expo Go** (Android). El celular y el PC deben estar en la misma red.

## Generar el instalable (.apk)
```bash
npx eas-cli build -p android --profile preview
```
Al terminar, EAS entrega un link para descargar e instalar el `.apk`.

## Configurar la API
En la pantalla de la app, escribir la dirección de la API en el campo **Dirección de la API**:
- En la misma red Wi-Fi: `http://IP_DEL_PC:8000`
- Con túnel de Cloudflare: `https://...trycloudflare.com`

Luego tocar **Probar conexión**.
