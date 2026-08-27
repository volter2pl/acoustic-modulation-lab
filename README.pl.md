# Acoustic Modulation Lab

**Język:** [English](README.md) | Polski | [Deutsch](README.de.md)

**Acoustic Modulation Lab pozwala zobaczyć i usłyszeć zasady modulacji radiowej
AM i FM bezpośrednio w zwykłej przeglądarce.**

Zamiast modulować elektromagnetyczną falę nośną, laboratorium moduluje nośną
akustyczną zapisaną jako sygnał audio o częstotliwości próbkowania 48 kHz.
Ośrodek fizyczny jest inny, ale równania AM i FM oraz zasady powstawania wstęg
bocznych, strojenia i demodulacji pozostają takie same.

[Otwórz laboratorium po polsku](https://volter2pl.github.io/acoustic-modulation-lab/?lang=pl)
· [Deutsch](https://volter2pl.github.io/acoustic-modulation-lab/?lang=de)

```text
głos lub muzyka
      ↓
nadajnik AM albo FM
      ↓
sygnał akustyczny o wysokiej częstotliwości
      ↓
dostrojony odbiornik AM albo FM
      ↓
odzyskany głos lub muzyka
```

## Co pokazuje laboratorium

Wybierz rodzaj modulacji i porównaj, jak każda z nich zapisuje to samo nagranie:

| | AM | FM |
| --- | --- | --- |
| Zmieniana wielkość | Amplituda nośnej | Częstotliwość chwilowa |
| Główny parametr | Głębokość modulacji | Dewiacja częstotliwości |
| Widmo | Nośna i dwie wstęgi boczne | Nośna i wiele wstęg bocznych |
| Wielkość mierzona przez odbiornik | Moduł obwiedni I/Q | Zmiana fazy I/Q |
| Dodatkowy eksperyment | Przemodulowanie | Skalowany RDS |

Aplikacja przedstawia trzy kolejne sygnały:

1. **Wiadomość** — wbudowane nagranie, własny plik audio albo dźwięk z
   mikrofonu.
2. **Sygnał modulowany** — nośna AM lub FM wraz ze wstęgami bocznymi.
3. **Odzyskany dźwięk** — wiadomość odtworzona przez odpowiedni odbiornik.

Każda wizualizacja jest spektrogramem: czas płynie od lewej do prawej,
częstotliwość rośnie od dołu do góry, a jaśniejszy kolor oznacza większą
energię. Widoki wiadomości i odzyskanego dźwięku obejmują zakres 0–8 kHz.
Widok sygnału modulowanego pokazuje pełny zakres 0–24 kHz dostępny przy
próbkowaniu 48 kHz.

Pełne omówienie teorii i przyjętych rozwiązań znajduje się w rozdziałach:

- [Modulacja amplitudy](docs/pl/am.md)
- [Modulacja częstotliwości i RDS](docs/pl/fm.md)

## Pojedyncza stacja i pasmo radiowe

Tryb **Single station** udostępnia charakterystyczny parametr wybranej
modulacji. Dla AM można ustawić głębokość od 0% do 150%, włącznie z celowym
przemodulowaniem. Dla FM dostępna jest dewiacja nośnej oraz opcjonalne,
przeskalowane dane PS lub RadioText.

Tryb **Radio band** łączy trzy niezależne stacje na częstotliwościach 5, 12 i
19 kHz w jednym pliku audio. Każda stacja może korzystać z innego programu i
poziomu sygnału. Odbiornik można przestrajać w sposób ciągły podczas odtwarzania
wspólnego pasma, dzięki czemu przesunięcie suwaka natychmiast zmienia odbieraną
stację.

Spektrogram odzyskanego dźwięku i pobierany plik WAV są migawkami wykonanymi dla
ostatnio analizowanej częstotliwości. Odsłuch na żywo od razu podąża za suwakiem
strojenia. Do czasu użycia przycisku **Update spectrum & WAV** interfejs
oznacza starszy spektrogram częstotliwością, dla której został utworzony.

Programy nie muszą mieć jednakowego czasu trwania. Wspólny kanał ma długość
najdłuższego nagrania, a krótszy program AM lub FM po zakończeniu pozostawia
niemodulowaną nośną.

## Dlaczego jest to analogia

Nośna rozgłośni radiowej jest falą elektromagnetyczną o częstotliwości radiowej.
Ten eksperyment wykorzystuje zmiany ciśnienia akustycznego i częstotliwości
audio, aby zwykła przeglądarka mogła taki sygnał wygenerować, wyświetlić, a
czasem również odtworzyć przez głośnik.

| Transmisja radiowa | Laboratorium akustyczne |
| --- | --- |
| Elektromagnetyczna fala nośna | Nośna w postaci zmian ciśnienia akustycznego |
| Generator RF | Generator audio w przeglądarce |
| Antena i wolna przestrzeń | Plik audio albo głośnik i powietrze |
| Odbiornik radiowy | Demodulator AM lub FM w przeglądarce |

Nie jest to zamiana fali radiowej na dźwięk. To zastosowanie tej samej
matematyki modulacji do innego rodzaju fali.

## Wypróbuj eksperyment

Użyj jednego z dołączonych nagrań, przeciągnij własny plik audio albo nagraj
głos. Przeglądarki zwykle obsługują WAV, MP3, M4A/AAC, OGG/Vorbis i WebM/Opus,
choć dokładna lista zależy od konkretnego programu. Maksymalny czas sygnału
wejściowego wynosi 120 sekund.

Wygenerowane sygnały o wysokiej częstotliwości są odtwarzane ze zmniejszoną
głośnością i nigdy nie uruchamiają się automatycznie. Głośniki, mikrofony,
ulepszacze dźwięku i filtry urządzenia mogą usuwać nośne znajdujące się blisko
górnej granicy pasma słyszalnego.

Aby uruchomić laboratorium lokalnie na dowolnym wolnym porcie:

```bash
npm start -- 8080
```

Następnie otwórz `http://localhost:8080`.

AM i FM zmieniają sposób reprezentowania informacji. Nie szyfrują, nie
kompresują ani nie ukrywają nagrania źródłowego.
