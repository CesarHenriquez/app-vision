// App de reconocimiento facial - EP2 Deep Learning (AVY1103)
// Toma o elige una foto, el usuario ajusta un cuadrado alrededor de la cara, la app la lleva a
// 128x128x3 y la envía a la API FastAPI (POST /predecir/, campo "archivo").
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const URL_API_POR_DEFECTO = 'http://192.168.0.8:8000';
const TAMANO_IMAGEN = 128;
const TIEMPO_MAXIMO_MS = 20000;

// Recorte cuadrado central + redimensión a 128x128x3.
// Si el usuario ya recortó un cuadrado en el editor, el recorte central no cambia nada.
async function prepararImagen128(foto) {
  const ladoMenor = Math.min(foto.width, foto.height);
  const contexto = ImageManipulator.manipulate(foto.uri);
  contexto
    .crop({
      originX: Math.floor((foto.width - ladoMenor) / 2),
      originY: Math.floor((foto.height - ladoMenor) / 2),
      width: ladoMenor,
      height: ladoMenor,
    })
    .resize({ width: TAMANO_IMAGEN, height: TAMANO_IMAGEN });
  const imagenRenderizada = await contexto.renderAsync();
  return imagenRenderizada.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
}

// Envía la imagen como multipart/form-data usando XMLHttpRequest (red nativa de React Native).
// Se usa en vez de fetch porque el fetch de Expo SDK 58 no acepta archivos {uri, name, type} en FormData.
function enviarImagenMultipart(urlDestino, uriImagen) {
  return new Promise((resolver, rechazar) => {
    const formulario = new FormData();
    formulario.append('archivo', { uri: uriImagen, name: 'rostro_128.jpg', type: 'image/jpeg' });

    const peticion = new XMLHttpRequest();
    peticion.open('POST', urlDestino);
    peticion.timeout = TIEMPO_MAXIMO_MS;
    peticion.onload = () => {
      try {
        const datos = JSON.parse(peticion.responseText);
        if (peticion.status >= 200 && peticion.status < 300) resolver(datos);
        else rechazar(new Error(datos.detail || `Error HTTP ${peticion.status}`));
      } catch {
        rechazar(new Error(`Respuesta no válida de la API (HTTP ${peticion.status})`));
      }
    };
    peticion.onerror = () => rechazar(new Error('Error de red al enviar la foto'));
    peticion.ontimeout = () => rechazar(new Error('La API tardó demasiado en responder'));
    peticion.send(formulario);
  });
}

export default function App() {
  const [urlApi, setUrlApi] = useState(URL_API_POR_DEFECTO);
  const [uriImagen128, setUriImagen128] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeConexion, setMensajeConexion] = useState(null);
  const [cargando, setCargando] = useState(false);

  const urlBase = () => urlApi.trim().replace(/\/+$/, '');

  // Diagnóstico: GET simple a la raíz de la API, sin enviar foto
  async function probarConexion() {
    setResultado(null);
    setMensajeError(null);
    setMensajeConexion('Probando conexión...');
    try {
      const respuesta = await fetch(`${urlBase()}/`);
      const datos = await respuesta.json();
      setMensajeConexion(`Conexión OK (HTTP ${respuesta.status}): ${datos.estado}`);
    } catch (error) {
      setMensajeConexion(null);
      setMensajeError(`Falla la conexión: ${error.name} - ${error.message}`);
    }
  }

  async function obtenerFoto(usarCamara) {
    setResultado(null);
    setMensajeError(null);
    setMensajeConexion(null);
    const permiso = usarCamara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setMensajeError('Se necesita permiso para usar la cámara o la galería.');
      return;
    }
    // allowsEditing + aspect 1:1: el usuario ajusta un cuadrado alrededor de la cara (como los recortes del entrenamiento)
    const opciones = { mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [1, 1] };
    const seleccion = usarCamara
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);
    if (seleccion.canceled) return;

    setCargando(true);
    try {
      const imagen128 = await prepararImagen128(seleccion.assets[0]);
      setUriImagen128(imagen128.uri);
      const datos = await enviarImagenMultipart(`${urlBase()}/predecir/`, imagen128.uri);
      setResultado(datos);
    } catch (error) {
      setMensajeError(`Error: ${error.message}. Revisa que la API esté encendida y en el mismo WiFi (${urlBase()}).`);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <StatusBar style="dark" />
      <Text style={estilos.titulo}>Reconocimiento Facial</Text>
      <Text style={estilos.subtitulo}>Deep Learning · DuocUC</Text>

      <Text style={estilos.etiqueta}>Dirección de la API</Text>
      <TextInput
        style={estilos.campoTexto}
        value={urlApi}
        onChangeText={setUrlApi}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Pressable style={estilos.botonPrueba} onPress={probarConexion} disabled={cargando}>
        <Text style={estilos.textoBotonPrueba}>Probar conexión</Text>
      </Pressable>

      <View style={estilos.filaBotones}>
        <Pressable style={estilos.boton} onPress={() => obtenerFoto(true)} disabled={cargando}>
          <Text style={estilos.textoBoton}>Tomar foto</Text>
        </Pressable>
        <Pressable style={[estilos.boton, estilos.botonSecundario]} onPress={() => obtenerFoto(false)} disabled={cargando}>
          <Text style={[estilos.textoBoton, estilos.textoBotonSecundario]}>Galería</Text>
        </Pressable>
      </View>

      <Text style={estilos.ayuda}>Ajusta el cuadrado para que la cara quede completa y ocupe casi todo el cuadro.</Text>

      {mensajeConexion && <Text style={estilos.ok}>{mensajeConexion}</Text>}

      {uriImagen128 && (
        <View style={estilos.bloqueImagen}>
          <Image source={{ uri: uriImagen128 }} style={estilos.imagen} />
          <Text style={estilos.notaImagen}>Imagen enviada (128×128×3)</Text>
        </View>
      )}

      {cargando && <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 24 }} />}

      {mensajeError && <Text style={estilos.error}>{mensajeError}</Text>}

      {resultado && (
        <View style={[estilos.tarjeta, resultado.reconocido ? estilos.tarjetaOk : estilos.tarjetaNo]}>
          <Text style={estilos.nombre}>
            {resultado.reconocido
              ? resultado.nombre
              : (resultado.rostro_detectado === false ? 'No se detectó un rostro' : 'No está en la base de datos')}
          </Text>
          {resultado.rostro_detectado === false ? (
            <Text style={estilos.confianza}>{resultado.mensaje}</Text>
          ) : (
            <>
              <Text style={estilos.confianza}>Confianza: {(resultado.confianza * 100).toFixed(1)} %</Text>
              <Text style={estilos.etiquetaTop}>Más probables:</Text>
              {resultado.top3.map((candidato) => (
                <Text key={candidato.nombre} style={estilos.candidato}>
                  {candidato.nombre} — {(candidato.probabilidad * 100).toFixed(1)} %
                </Text>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 64 },
  titulo: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitulo: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  etiqueta: { fontSize: 13, color: '#475569', marginBottom: 6 },
  campoTexto: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10,
    backgroundColor: '#fff', fontSize: 15, marginBottom: 12,
  },
  botonPrueba: {
    paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#94a3b8', backgroundColor: '#f1f5f9',
  },
  textoBotonPrueba: { color: '#334155', fontSize: 15, fontWeight: '600' },
  filaBotones: { flexDirection: 'row', gap: 12 },
  boton: { flex: 1, backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  botonSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1d4ed8' },
  textoBoton: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textoBotonSecundario: { color: '#1d4ed8' },
  ayuda: { fontSize: 12, color: '#64748b', marginTop: 10 },
  bloqueImagen: { alignItems: 'center', marginTop: 24 },
  imagen: { width: 192, height: 192, borderRadius: 12 },
  notaImagen: { fontSize: 12, color: '#64748b', marginTop: 6 },
  ok: { color: '#047857', marginTop: 20, fontSize: 14 },
  error: { color: '#b91c1c', marginTop: 20, fontSize: 14 },
  tarjeta: { marginTop: 24, padding: 18, borderRadius: 12, borderWidth: 1 },
  tarjetaOk: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  tarjetaNo: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  nombre: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  confianza: { fontSize: 15, color: '#334155', marginTop: 4, marginBottom: 12 },
  etiquetaTop: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  candidato: { fontSize: 14, color: '#334155' },
});