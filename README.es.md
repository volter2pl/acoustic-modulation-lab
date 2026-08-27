# Laboratorio de modulación acústica

**Idioma:** [English](README.md) | [Polski](README.pl.md) |
[Deutsch](README.de.md) | Español | [Português (Brasil)](README.pt-BR.md) |
[简体中文](README.zh-CN.md) | [日本語](README.ja.md)

**El Laboratorio de modulación acústica permite ver y escuchar los principios
de la radio AM y FM directamente en un navegador convencional.**

En lugar de modular una portadora electromagnética, el laboratorio modula una
portadora acústica almacenada como una señal de audio con una frecuencia de
muestreo de 48 kHz. El medio físico es diferente, pero las ecuaciones de AM y
FM y los principios de las bandas laterales, la sintonización y la demodulación
siguen siendo los mismos.

[Abrir el laboratorio en español](https://volter2pl.github.io/acoustic-modulation-lab/?lang=es)
· [Português (Brasil)](https://volter2pl.github.io/acoustic-modulation-lab/?lang=pt-BR)
· [简体中文](https://volter2pl.github.io/acoustic-modulation-lab/?lang=zh-CN)
· [日本語](https://volter2pl.github.io/acoustic-modulation-lab/?lang=ja)

```text
voz o música
      ↓
transmisor AM o FM
      ↓
señal acústica de alta frecuencia
      ↓
receptor AM o FM sintonizado
      ↓
voz o música recuperada
```

## Qué demuestra el laboratorio

Elige un tipo de modulación y compara cómo transmite cada uno la misma
grabación:

| | AM | FM |
| --- | --- | --- |
| Magnitud que cambia | Amplitud de la portadora | Frecuencia instantánea |
| Parámetro principal | Profundidad de modulación | Desviación de frecuencia |
| Espectro | Portadora con dos bandas laterales | Portadora con varias bandas laterales |
| Medición del receptor | Magnitud de la envolvente I/Q | Cambio de fase I/Q |
| Experimento adicional | Sobremodulación | RDS a escala |

La aplicación presenta tres señales consecutivas:

1. **Mensaje** — una grabación incluida, tu propio archivo de audio o una
   entrada de micrófono.
2. **Señal modulada** — la portadora AM o FM y sus bandas laterales.
3. **Audio recuperado** — el mensaje reconstruido por el receptor
   correspondiente.

Cada visualización es un espectrograma: el tiempo avanza de izquierda a
derecha, la frecuencia aumenta de abajo arriba y un color más claro indica más
energía. Las vistas del mensaje y del audio recuperado cubren de 0 a 8 kHz. La
vista de la señal modulada cubre todo el rango de 0 a 24 kHz disponible con una
frecuencia de muestreo de 48 kHz.

Para consultar la teoría completa y las decisiones de implementación:

- [Modulación de amplitud](docs/es/am.md)
- [Modulación de frecuencia y RDS](docs/es/fm.md)

## Una emisora y banda de radio

El modo **Una emisora** muestra el control característico del tipo de
modulación seleccionado. AM permite una profundidad de 0% a 150%, incluida la
sobremodulación intencionada. FM permite ajustar la desviación de la portadora
y añadir opcionalmente datos PS o RadioText a escala.

El modo **Banda de radio** combina tres emisoras independientes en 5, 12 y
19 kHz dentro de un solo archivo de audio. Cada emisora puede usar un programa
y un nivel de señal diferentes. El receptor puede sintonizarse continuamente
mientras la banda compartida sigue reproduciéndose, por lo que mover el dial
cambia de emisora en tiempo real.

El espectrograma recuperado y el archivo WAV descargable son capturas creadas
en la última frecuencia analizada. El audio en directo sigue inmediatamente el
control de sintonización; la interfaz marca un espectro anterior hasta que se
usa **Actualizar espectro y WAV**.

Los programas no tienen que durar lo mismo. El canal compartido adopta la
duración de la grabación más larga, mientras que una emisora AM o FM más corta
continúa como una portadora sin modular después de terminar su mensaje.

## Por qué es una analogía

Una portadora de radiodifusión se propaga como una onda electromagnética a
frecuencias de radio. Este experimento utiliza variaciones de presión del aire
y frecuencias de audio para que un navegador convencional pueda generar,
mostrar y, en algunos casos, reproducir la señal.

| Transmisión de radio | Laboratorio acústico |
| --- | --- |
| Portadora electromagnética | Portadora de presión sonora |
| Oscilador de RF | Oscilador generado por el navegador |
| Antena y espacio libre | Archivo de audio o altavoz y aire |
| Receptor de radio | Demodulador AM o FM del navegador |

Esto no convierte una onda de radio en sonido. Aplica las mismas matemáticas de
modulación a otro tipo de onda.

## Prueba el experimento

Utiliza una de las muestras incluidas, suelta un archivo de audio o graba tu
voz. Los navegadores suelen admitir WAV, MP3, M4A/AAC, OGG/Vorbis y WebM/Opus,
aunque la compatibilidad exacta puede variar. La entrada está limitada a
120 segundos.

Las señales de alta frecuencia generadas se reproducen a un volumen reducido y
nunca se inician automáticamente. Los altavoces, micrófonos, mejoras de audio y
filtros del dispositivo pueden eliminar portadoras cercanas al extremo superior
del espectro audible.

Para ejecutar el laboratorio localmente en cualquier puerto libre:

```bash
npm start -- 8080
```

Después, abre `http://localhost:8080`.

AM y FM cambian la forma en que se representa la información. No cifran,
comprimen ni ocultan la grabación original.
