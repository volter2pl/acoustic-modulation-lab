# Modulacja amplitudy

**Język:** [English](../en/am.md) | Polski | [Deutsch](../de/am.md) |
[Español](../es/am.md) | [Português (Brasil)](../pt-BR/am.md)

[Powrót do opisu laboratorium](../../README.pl.md)

Modulacja amplitudy zapisuje wiadomość w zmieniającej się obwiedni nośnej.
Eksperyment wykorzystuje klasyczną modulację AM z dwiema wstęgami bocznymi i
transmitowaną nośną — odmianę historycznie związaną z radiofonią AM oraz
prostymi detektorami obwiedni.

## Jak AM zapisuje wiadomość

Niech `m(t)` będzie wiadomością znormalizowaną do przedziału `[-1, 1]`, `fc`
częstotliwością nośnej, a `μ` głębokością modulacji:

```text
s(t) = A · [1 + μm(t)] · cos(2πfc t)
```

Nośna nadal oscyluje z częstotliwością `fc`; zmienia się wyłącznie jej
amplituda. Przy głębokości 80%, czyli `μ = 0,8`:

```text
m(t) = -1,0  →  obwiednia = 0,2A
m(t) =  0,0  →  obwiednia = 1,0A
m(t) = +1,0  →  obwiednia = 1,8A
```

Przy 0% plik zawiera niemodulowaną nośną bez wiadomości. Przy 100% obwiednia
dochodzi dokładnie do zera w ujemnym szczycie wiadomości.

## Nośna i wstęgi boczne

Wiadomość sinusoidalna o częstotliwości `fm` tworzy trzy wyraźne składowe
widma:

```text
dolna wstęga boczna   nośna   górna wstęga boczna
      fc - fm           fc           fc + fm
```

Mowa i muzyka zawierają wiele częstotliwości, dlatego po obu stronach nośnej
powstają lustrzane wstęgi boczne. Jeżeli wiadomość jest ograniczona do pasma
`B`, klasyczny sygnał AM zajmuje w przybliżeniu:

```text
szerokość pasma AM = 2B
```

W trybie pojedynczej stacji laboratorium ogranicza wiadomość do 2,4 kHz, co
daje kanał AM o szerokości około 4,8 kHz. Dzięki temu obie wstęgi boczne
mieszczą się poniżej częstotliwości Nyquista 24 kHz wynikającej z próbkowania
48 kHz.

## Przemodulowanie

Gdy głębokość przekracza 100%, część wyrażenia `1 + μm(t)` staje się ujemna.
Matematyczna nośna zmienia wtedy fazę o 180 stopni przy każdym przejściu
obwiedni przez zero, ale detektor obwiedni mierzy moduł i nie może zachować
znaku:

```text
zmierzona obwiednia = |1 + μm(t)|
```

Powstają zniekształcenia. Interfejs celowo pozwala ustawić wartość do 150% i
oznacza ją jako **Overmodulated**, zamiast blokować eksperyment. Dzięki temu
podstawowe ograniczenie AM jest jednocześnie widoczne w spektrogramie sygnału
modulowanego i słyszalne w odzyskanym nagraniu.

## Jak działa odbiornik

Odbiornik najpierw miesza rzeczywisty sygnał AM z generatorami cosinusowym i
sinusowym dostrojonymi do wybranej nośnej. Po filtracji pozostają składowe
synfazowa i kwadraturowa:

```text
z[n] = I[n] + jQ[n]
```

Ich moduł jest obwiednią:

```text
obwiednia[n] = sqrt(I[n]² + Q[n]²)
```

Filtr usuwający składową stałą odejmuje stały poziom nośnej, a filtr
dolnoprzepustowy programu usuwa pozostałe składowe wysokoczęstotliwościowe.
Kwadraturowy tor wejściowy zachowuje się jak idealny, dostrojony odbiornik
obwiedni: wybiera jedną nośną przed pomiarem jej amplitudy i działa nawet wtedy,
gdy faza lokalnego generatora nie jest zgodna z fazą nadajnika.

## Kilka stacji AM

Tryb pasma radiowego tworzy trzy klasyczne stacje AM:

```text
AM 5 kHz  ─┐
AM 12 kHz ─┼─→ jedno akustyczne pasmo radiowe
AM 19 kHz ─┘
```

Każdy program jest ograniczony do 2 kHz i transmitowany z głębokością 80%.
Jedna stacja zajmuje więc około 4 kHz, pozostawiając odstęp między sąsiednimi
nośnymi. Przed zsumowaniem poziomy trzech sygnałów są zmniejszane, aby wspólny
plik nie został przesterowany.

Odbiornik na żywo utrzymuje bieżącą pozycję wspólnego pliku, a jego lokalny
generator podąża za suwakiem **Receiver tuning**. Mieszanie przenosi wybraną
stację do pasma podstawowego. Filtr dolnoprzepustowy I/Q odrzuca stacje
pozostające poza pasmem odbiornika, po czym detektor obwiedni odzyskuje wybrany
program.

Gdy krótszy program się kończy, jego wiadomość przyjmuje wartość zero.
Odpowiadający mu nadajnik pozostaje więc czystą nośną aż do zakończenia
najdłuższego programu.

## Co warto obserwować

- Przy głębokości 0% pozostaje wyłącznie nośna.
- Zwiększanie głębokości wzmacnia obie wstęgi boczne, ale nie zmienia ich
  odległości od nośnej.
- Zmiana wiadomości wpływa na zawartość wstęg bocznych, a nie na częstotliwość
  nośnej.
- Powyżej 100% przejścia obwiedni przez zero powodują słyszalne zniekształcenia.
- Pomiędzy stacjami odbiornik stopniowo odrzuca oba kanały AM.

Nośna akustyczna może być słyszalna jako stały ton, ale nie jest nagraniem
źródłowym cicho dodanym do pliku. Wiadomość istnieje w obwiedni nośnej i musi
zostać odzyskana przez odbiornik.
