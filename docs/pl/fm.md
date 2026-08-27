# Modulacja częstotliwości i RDS

**Język:** [English](../en/fm.md) | Polski

[Powrót do opisu laboratorium](../../README.pl.md)

Modulacja częstotliwości zapisuje wiadomość w częstotliwości chwilowej nośnej
o stałej amplitudzie. W przeciwieństwie do AM obwiednia nośnej nie podąża
bezpośrednio za programem.

## Jak FM zapisuje wiadomość

Niech `m(t)` będzie znormalizowaną wiadomością, `fc` częstotliwością nośnej, a
`Δf` maksymalną dewiacją częstotliwości:

```text
fi(t) = fc + Δf · m(t)
```

Dla nośnej 18 kHz i dewiacji ±1 kHz:

```text
m(t) = -1,0  →  fi(t) = 17 kHz
m(t) =  0,0  →  fi(t) = 18 kHz
m(t) = +1,0  →  fi(t) = 19 kHz
```

Częstotliwość jest pochodną fazy, dlatego poprawna dyskretna modulacja FM musi
w sposób ciągły akumulować fazę generatora:

```text
faza += 2π · częstotliwośćChwilowa / częstotliwośćPróbkowania
próbkaFm = sin(faza)
```

Obliczanie kolejnych, niezależnych wartości sinusa z częstotliwości i czasu
bezwzględnego powodowałoby nieciągłości fazy i nie tworzyłoby poprawnego FM.

## Jak działa odbiornik FM

Odbiornik miesza sygnał z generatorami sinusowym i cosinusowym dostrojonymi do
wybranej nośnej. Po filtracji składowe tworzą zespolony sygnał w paśmie
podstawowym:

```text
z[n] = I[n] + jQ[n]
```

Odbiornik mierzy zmianę fazy pomiędzy sąsiednimi próbkami:

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
m[n] ≈ Δφ[n] · częstotliwośćPróbkowania / (2π · Δf)
```

Taki dyskryminator I/Q odzyskuje dewiację częstotliwości bez osobnego kroku
rozwijania fazy. Filtr dolnoprzepustowy programu pozostawia oryginalne nagranie.

## Szerokość pasma FM

Zakres chwilowy obejmuje jedynie nośną powiększoną lub pomniejszoną o dewiację.
Sygnał FM tworzy jednak również wstęgi boczne, dlatego laboratorium korzysta z
praktycznego przybliżenia znanego jako reguła Carsona:

```text
szerokość pasma FM ≈ 2 · (dewiacja + pasmo wiadomości)
```

Dźwięk pojedynczej stacji jest ograniczony do pasma mowy 2,4 kHz. Interfejs
odrzuca takie połączenia nośnej i dewiacji, dla których szacowane wstęgi boczne
przekroczyłyby dolną granicę widma albo częstotliwość Nyquista 24 kHz.

## Skalowany RDS

RDS pokazuje, że dźwięk programu i informacja cyfrowa mogą jednocześnie
modulować tę samą nośną FM. W rzeczywistym multipleksie stereofonicznym FM dane
RDS wykorzystują tłumioną nośną pomocniczą 57 kHz — dokładnie trzykrotność
pilota stereo 19 kHz — oraz szybkość 1187,5 bit/s.

Plik audio próbkowany z częstotliwością 48 kHz nie może reprezentować sygnału
57 kHz, dlatego wszystkie częstotliwości zegarowe RDS są dzielone przez osiem z
zachowaniem wzajemnych zależności:

| Składnik | RDS w radiofonii | Model akustyczny |
| --- | ---: | ---: |
| Pilot | 19 kHz | 2,375 kHz |
| Nośna pomocnicza RDS | 57 kHz | 7,125 kHz |
| Szybkość danych | 1187,5 bit/s | 148,4375 bit/s |

Dostępne są trzy tryby:

- **None** — wyłącznie dźwięk programu;
- **PS** — ośmioznakowa nazwa Programme Service w grupach 0A;
- **RadioText** — do 64 znaków w grupach 2A.

Model generuje bloki RDS, słowa kontrolne, kodowanie różnicowe i symbole
dwufazowe. Odbiornik odzyskuje poprawne grupy z demodulowanego przebiegu; tekst
nie jest przechowywany jako metadane WAV. Jeżeli źródło jest zbyt krótkie, aby
przesłać jeden pełny cykl danych, transmisja zostaje przedłużona ciszą w torze
programu.

Po demodulacji pełny multipleks trafia do dekodera danych. Osobny tor odsłuchowy
usuwa przeskalowany pilot i stosuje stromy filtr dolnoprzepustowy programu,
dzięki czemu odtwarzacz odzyskanego dźwięku zawiera program, a nie tony RDS.

RDS wymaga znacznie szerszego pasma podstawowego, dlatego zawęża bezpieczny
zakres nośnej akustycznej. Jest to przeskalowany przebieg edukacyjny, którego
nie zdekoduje komercyjny odbiornik RDS.

## Kilka stacji FM

Tryb pasma radiowego łączy nośne 5, 12 i 19 kHz. Każda stacja wykorzystuje
dewiację ±0,75 kHz oraz pasmo programu 2 kHz:

```text
FM 5 kHz  ─┐
FM 12 kHz ─┼─→ jedno akustyczne pasmo radiowe
FM 19 kHz ─┘
```

Szacowana szerokość kanału wynosi około 5,5 kHz, co pozostawia odstęp pomiędzy
stacjami. Odbiornik na żywo w sposób ciągły zmienia częstotliwość lokalnego
generatora podczas odtwarzania wspólnego pasma, dlatego strojenie zachowuje się
jak obracanie pokrętła radia.

RDS jest wyłączony w trybie pasma radiowego. W modelu 1:8 jedna stacja z RDS
zajmuje około 17,2 kHz; kilka uczciwie odwzorowanych kanałów RDS nie zmieściłoby
się w dostępnym widmie audio 0–24 kHz.

Gdy program się kończy, jego wiadomość przyjmuje wartość zero, a stacja
pozostaje niemodulowaną nośną. Regulatory poziomu zmieniają siłę stacji, a
mikser zachowuje zapas amplitudy dla wszystkich trzech nadajników.

## Co warto obserwować

- Niższe nośne łatwiej usłyszeć jako zmieniający się gwizd.
- Większa dewiacja rozkłada energię dalej od nośnej.
- Amplituda nośnej pozostaje stała, podczas gdy zmienia się tempo jej cykli.
- RDS tworzy widoczne składowe multipleksu o wysokiej częstotliwości jeszcze
  przed modulacją FM.
- Pomiędzy stacjami odbiornik odrzuca nośne pozostające poza jego filtrem pasma
  podstawowego.

FM nie jest cichą kopią źródła ukrytą pod tonem. To jeden ciągły przebieg,
którego zakumulowana faza przenosi nagranie.
