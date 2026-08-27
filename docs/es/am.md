# Modulación de amplitud

**Idioma:** [English](../en/am.md) | [Polski](../pl/am.md) |
[Deutsch](../de/am.md) | Español | [Português (Brasil)](../pt-BR/am.md) |
[简体中文](../zh-CN/am.md) | [日本語](../ja/am.md) |
[Français](../fr/am.md)

[Volver a la descripción del laboratorio](../../README.es.md)

La modulación de amplitud almacena un mensaje en la envolvente variable de una
portadora. El experimento utiliza AM convencional de doble banda lateral con
portadora transmitida, la forma asociada históricamente con la radiodifusión AM
y los detectores de envolvente sencillos.

## Cómo almacena AM un mensaje

Sean `m(t)` un mensaje normalizado al intervalo `[-1, 1]`, `fc` la frecuencia
de la portadora y `μ` la profundidad de modulación:

```text
s(t) = A · [1 + μm(t)] · cos(2πfc t)
```

La portadora continúa oscilando en `fc`; solo cambia su amplitud. Con una
profundidad del 80%, `μ = 0.8`:

```text
m(t) = -1.0  →  envolvente = 0.2A
m(t) =  0.0  →  envolvente = 1.0A
m(t) = +1.0  →  envolvente = 1.8A
```

Al 0%, el archivo contiene una portadora sin modular y ningún mensaje. Al
100%, la envolvente alcanza exactamente cero en el pico negativo del mensaje.

## Portadora y bandas laterales

Un mensaje sinusoidal de frecuencia `fm` crea tres componentes espectrales
claros:

```text
banda lateral inferior   portadora   banda lateral superior
       fc - fm              fc              fc + fm
```

La voz y la música reales contienen muchas frecuencias, por lo que producen
bandas laterales inferior y superior simétricas alrededor de la portadora. Si
el mensaje está limitado al ancho de banda `B`, la AM convencional ocupa
aproximadamente:

```text
ancho de banda AM ocupado = 2B
```

El laboratorio limita el mensaje de una sola emisora a 2,4 kHz, lo que produce
un canal AM de unos 4,8 kHz. Así, ambas bandas laterales caben fielmente por
debajo de la frecuencia de Nyquist de 24 kHz de un archivo de audio a 48 kHz.

## Sobremodulación

Cuando la profundidad supera el 100%, una parte de `1 + μm(t)` se vuelve
negativa. La portadora matemática cambia de fase 180 grados en cada cruce por
cero de la envolvente, pero un detector de envolvente mide la magnitud y no
puede conservar ese signo:

```text
envolvente medida = |1 + μm(t)|
```

El resultado es distorsión. La interfaz permite deliberadamente valores de
hasta el 150% y los marca como **Sobremodulada** en lugar de bloquearlos. De
esta forma, un límite fundamental de AM se vuelve visible en el espectro
modulado y audible en la grabación recuperada.

## Cómo funciona el receptor

El receptor mezcla primero la forma de onda AM real con osciladores de coseno y
seno en la frecuencia de la portadora seleccionada. Los filtros paso bajo dejan
las componentes en fase y en cuadratura:

```text
z[n] = I[n] + jQ[n]
```

Su magnitud es la envolvente:

```text
envolvente[n] = sqrt(I[n]² + Q[n]²)
```

Un bloqueador de continua elimina el nivel constante de la portadora y un
filtro paso bajo del programa elimina los términos residuales de alta
frecuencia. La etapa de entrada en cuadratura se comporta como un receptor de
envolvente sintonizado ideal: selecciona una portadora antes de medir su
amplitud y funciona incluso cuando la fase del oscilador no coincide con la del
transmisor.

## Varias emisoras AM

El modo de banda de radio crea tres emisoras AM convencionales:

```text
5 kHz AM  ─┐
12 kHz AM ─┼─→ una banda de radio acústica
19 kHz AM ─┘
```

Cada programa está limitado a 2 kHz y se transmite con una profundidad del
80%. Por tanto, una emisora ocupa aproximadamente 4 kHz y queda separación
entre portadoras vecinas. El nivel de las tres formas de onda se reduce antes
de sumarlas para evitar que el archivo combinado sature.

El receptor en directo mantiene en marcha la línea temporal del archivo común
mientras su oscilador local sigue la **Sintonización del receptor**. La mezcla
desplaza la emisora seleccionada a la banda base; el filtro paso bajo I/Q
rechaza las emisoras que permanecen fuera de la banda de paso del receptor y el
detector de envolvente recupera el programa elegido.

Cuando termina un programa más corto, su mensaje pasa a ser cero. El transmisor
correspondiente continúa como una portadora pura hasta que finaliza el programa
más largo.

## Qué observar

- Al 0% solo permanece la portadora.
- Al aumentar la profundidad se refuerzan ambas bandas laterales sin cambiar su
  distancia respecto a la portadora.
- Cambiar el mensaje modifica el contenido de las bandas laterales, no la
  frecuencia de la portadora.
- Por encima del 100%, los cruces por cero de la envolvente producen distorsión
  audible.
- Entre emisoras, el receptor rechaza progresivamente ambos canales AM.

La portadora acústica puede oírse como un tono constante, pero no es una copia
silenciosa de la grabación original mezclada con el archivo. El mensaje existe
en la envolvente de la portadora y debe ser recuperado por un receptor.
