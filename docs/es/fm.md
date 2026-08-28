# Modulación de frecuencia y RDS

**Idioma:** [English](../en/fm.md) | [Polski](../pl/fm.md) |
[Deutsch](../de/fm.md) | Español | [Português (Brasil)](../pt-BR/fm.md) |
[简体中文](../zh-CN/fm.md) | [日本語](../ja/fm.md) |
[Français](../fr/fm.md)

[Volver a la descripción del laboratorio](../../README.es.md)

La modulación de frecuencia almacena un mensaje en la frecuencia instantánea
de una portadora de amplitud constante. A diferencia de AM, la envolvente de la
portadora no sigue directamente el programa.

## Cómo almacena FM un mensaje

Sean `m(t)` el mensaje normalizado, `fc` la frecuencia de la portadora y `Δf`
la desviación máxima de frecuencia:

```text
fi(t) = fc + Δf · m(t)
```

Para una portadora de 18 kHz y una desviación de ±1 kHz:

```text
m(t) = -1.0  →  fi(t) = 17 kHz
m(t) =  0.0  →  fi(t) = 18 kHz
m(t) = +1.0  →  fi(t) = 19 kHz
```

La frecuencia es la derivada de la fase, por lo que una FM discreta correcta
acumula continuamente la fase del oscilador:

```text
phase += 2π · instantaneousFrequency / sampleRate
fmSample = sin(phase)
```

Calcular un nuevo seno independiente a partir de la frecuencia y del tiempo
absoluto crearía discontinuidades de fase y no produciría una FM correcta.

## Cómo funciona el receptor FM

El receptor mezcla la señal con osciladores de seno y coseno en la frecuencia
de la portadora seleccionada. Después del filtrado, las componentes forman una
señal compleja de banda base:

```text
z[n] = I[n] + jQ[n]
```

El receptor mide el cambio de fase entre muestras adyacentes:

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
m[n] ≈ Δφ[n] · sampleRate / (2π · Δf)
```

Este discriminador I/Q recupera la desviación de frecuencia sin una etapa
separada de desenvolvimiento de fase. Un filtro paso bajo del programa deja la
grabación original.

## Ancho de banda FM

El rango instantáneo solo comprende la portadora más o menos la desviación. Sin
embargo, una señal FM también posee bandas laterales, por lo que el experimento
utiliza la útil estimación de Carson:

```text
ancho de banda FM ocupado ≈ 2 · (desviación + ancho de banda del mensaje)
```

El audio de una sola emisora está limitado a una banda de voz de 2,4 kHz. La
interfaz rechaza las combinaciones de portadora y desviación cuyas bandas
laterales estimadas crucen el límite inferior del espectro o el límite de
Nyquist de 24 kHz.

## RDS a escala

RDS demuestra que el audio del programa y la información digital pueden
modular simultáneamente la misma portadora FM. En un múltiplex FM estéreo real,
RDS utiliza una subportadora suprimida de 57 kHz —exactamente tres veces el
piloto estéreo de 19 kHz— y una velocidad de datos de 1187,5 bit/s.

Un archivo de audio a 48 kHz no puede representar 57 kHz, por lo que todos los
relojes de RDS se dividen entre ocho conservando su relación:

| Componente | RDS de radiodifusión | Modelo acústico |
| --- | ---: | ---: |
| Piloto | 19 kHz | 2,375 kHz |
| Subportadora RDS | 57 kHz | 7,125 kHz |
| Velocidad de datos | 1187,5 bit/s | 148,4375 bit/s |

Los modos disponibles son:

- **Ninguno** — solo audio del programa;
- **PS** — un nombre de emisora Programme Service de ocho caracteres en grupos
  0A;
- **RadioText** — hasta 64 caracteres en grupos 2A.

Los campos PS y RadioText aceptan caracteres ASCII imprimibles. El texto no
admitido se comunica antes de codificarlo en lugar de modificarlo en silencio.

El modelo genera bloques RDS, palabras de comprobación, codificación diferencial
y símbolos bifase. El receptor recupera grupos válidos de la forma de onda
demodulada; el texto no se almacena como metadatos WAV. Si la fuente es
demasiado corta para completar un ciclo de datos, un tramo de audio silencioso
prolonga la transmisión.

Después de la demodulación, el múltiplex completo alimenta el decodificador de
datos. Una ruta de escucha independiente elimina el piloto a escala y aplica un
filtro paso bajo pronunciado al programa, de modo que el reproductor de audio
recuperado contiene el programa en lugar de los tonos RDS.

RDS requiere una banda base mucho más ancha y, por tanto, reduce el rango seguro
de la portadora acústica. Esta es una forma de onda educativa a escala, no una
que pueda decodificar un receptor RDS comercial.

## Varias emisoras FM

El modo de banda de radio combina tres emisoras cuyas portadoras están en 5, 12
y 19 kHz de forma predeterminada. Cada emisora utiliza una desviación de
±0,75 kHz y una banda de programa de 2 kHz:

```text
5 kHz FM  ─┐
12 kHz FM ─┼─→ una banda de radio acústica
19 kHz FM ─┘
```

El ancho de canal estimado es de unos 5,5 kHz. Cada emisora permite ajustar su
nivel de señal, una portadora de 4 a 20 kHz en pasos de 0,1 kHz y la fase en el
receptor de 0° a 345° en pasos de 15°. La disposición predeterminada deja
separación entre las emisoras. El receptor en directo cambia continuamente su
oscilador local mientras se reproduce la banda común, por lo que la
sintonización se comporta como el dial de una radio.

Acercar las portadoras hace que se superpongan sus espectros ocupados. Las
emisoras situadas en la misma portadora no pueden separarse mediante la
sintonización; el discriminador recibe su suma vectorial. La fase relativa
controla si las formas de onda cocanal iguales se refuerzan o se cancelan,
mientras que programas diferentes suelen producir interferencia y distorsión
variables.

RDS está desactivado en el modo de banda de radio. En el modelo a escala 1:8,
una emisora RDS ocupa aproximadamente 17,2 kHz; no cabrían varios canales RDS
representados fielmente en el espectro de audio disponible de 0 a 24 kHz.

Cuando termina un programa, su mensaje pasa a ser cero y la emisora continúa
como una portadora sin modular. Los controles de nivel cambian la intensidad de
cada emisora, mientras el mezclador reserva margen para los tres transmisores.

El receptor utiliza un filtro de canal pronunciado en banda base compleja y no
aplica silenciamiento. Una emisora aislada se atenúa al salir del canal
seleccionado. Entre dos canales ocupados pueden entrar partes de ambos espectros
en el filtro, por lo que siguen siendo audibles la captura, la interferencia y
el audio distorsionado. El discriminador limita los saltos de fase extremos
para evitar la saturación.

## Qué observar

- Las portadoras más bajas se oyen con mayor facilidad como un silbido
  variable.
- Una desviación mayor distribuye la energía más lejos de la portadora.
- La portadora mantiene una amplitud constante mientras cambia la velocidad de
  sus ciclos.
- RDS crea componentes múltiplex visibles de alta frecuencia antes de la
  modulación FM.
- Entre emisoras se oyen atenuación, captura e interferencia, no un
  silenciamiento automático.

FM no es una copia silenciosa de la fuente escondida debajo de un tono. Es una
única forma de onda continua cuya fase acumulada transporta la grabación.
