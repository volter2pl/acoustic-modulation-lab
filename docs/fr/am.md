# Modulation d’amplitude

**Langue :** [English](../en/am.md) | [Polski](../pl/am.md) |
[Deutsch](../de/am.md) | [Español](../es/am.md) |
[Português (Brasil)](../pt-BR/am.md) | [简体中文](../zh-CN/am.md) |
[日本語](../ja/am.md) | Français

[Retour à la présentation du laboratoire](../../README.fr.md)

La modulation d’amplitude inscrit un message dans l’enveloppe variable d’une
porteuse. L’expérience utilise une AM conventionnelle à double bande latérale
avec porteuse transmise, historiquement associée à la radiodiffusion AM et aux
récepteurs simples à détection d’enveloppe.

## Comment l’AM stocke un message

Soient `m(t)` un message normalisé dans `[-1, 1]`, `fc` la fréquence de la
porteuse et `μ` la profondeur de modulation :

```text
s(t) = A · [1 + μm(t)] · cos(2πfc t)
```

La porteuse continue d’osciller à `fc` ; seule son amplitude varie. À une
profondeur de 80 %, `μ = 0,8` :

```text
m(t) = -1,0  →  enveloppe = 0,2A
m(t) =  0,0  →  enveloppe = 1,0A
m(t) = +1,0  →  enveloppe = 1,8A
```

À 0 %, le fichier ne contient qu’une porteuse non modulée, sans message. À
100 %, l’enveloppe atteint exactement zéro au minimum du message.

## Porteuse et bandes latérales

Un message sinusoïdal de fréquence `fm` produit trois composantes spectrales
nettes :

```text
bande latérale inférieure   porteuse   bande latérale supérieure
        fc - fm                fc               fc + fm
```

La parole et la musique réelles contiennent de nombreuses fréquences et
produisent des bandes latérales inférieure et supérieure symétriques autour de
la porteuse. Si le message est limité à une largeur de bande `B`, l’AM ordinaire
occupe approximativement :

```text
largeur de bande AM occupée = 2B
```

Le laboratoire limite le message d’une station unique à 2,4 kHz, ce qui produit
un canal AM d’environ 4,8 kHz. Les deux bandes latérales restent ainsi réellement
sous la fréquence de Nyquist de 24 kHz d’un fichier audio à 48 kHz.

## Surmodulation

Lorsque la profondeur dépasse 100 %, une partie de `1 + μm(t)` devient
négative. La porteuse mathématique change de phase de 180 degrés à chaque
passage à zéro de l’enveloppe, mais un détecteur d’enveloppe mesure un module et
ne peut pas conserver ce signe :

```text
enveloppe mesurée = |1 + μm(t)|
```

Il en résulte une distorsion. L’interface autorise volontairement des valeurs
jusqu’à 150 % et les marque **Surmodulée** au lieu de les bloquer. Cette limite
fondamentale de l’AM devient ainsi visible dans le spectre modulé et audible
dans l’enregistrement récupéré.

## Fonctionnement du récepteur

Le récepteur mélange d’abord l’onde AM réelle avec des oscillateurs cosinus et
sinus accordés sur la porteuse sélectionnée. Des filtres passe-bas ne conservent
que les composantes en phase et en quadrature :

```text
z[n] = I[n] + jQ[n]
```

Leur module est l’enveloppe :

```text
enveloppe[n] = sqrt(I[n]² + Q[n]²)
```

Un bloqueur de composante continue retire le niveau constant de la porteuse et
un filtre passe-bas du programme supprime les résidus à haute fréquence. Cette
entrée en quadrature se comporte comme un récepteur d’enveloppe idéal et
accordé : elle sélectionne une porteuse avant de mesurer son amplitude et
fonctionne même lorsque la phase de l’oscillateur n’est pas alignée sur celle
de l’émetteur.

## Plusieurs stations AM

Le mode bande radio crée trois stations AM conventionnelles. Leurs porteuses
par défaut sont représentées ci-dessous :

```text
5 kHz AM  ─┐
12 kHz AM ─┼─→ une bande radio acoustique
19 kHz AM ─┘
```

Chaque programme est limité à 2 kHz et transmis à une profondeur de 80 %. Une
station occupe donc environ 4 kHz. Chaque station permet de régler son niveau
de signal, sa porteuse de 4 à 20 kHz par pas de 0,1 kHz et sa phase au récepteur
de 0° à 345° par pas de 15°. Le niveau des trois formes d’onde est réduit avant
leur addition afin que le fichier combiné reste sous le seuil d’écrêtage.

Les porteuses par défaut laissent un espacement entre les canaux voisins. Les
rapprocher fait se chevaucher leurs bandes latérales. Les stations sur une même
porteuse ne peuvent pas être séparées par l’accord ; leurs formes d’onde
s’additionnent directement. Des signaux cocanaux identiques se renforcent avec
une phase relative de 0° et peuvent s’annuler à 180°. Avec des programmes
différents, l’annulation n’est généralement que partielle.

Le récepteur en direct laisse défiler la chronologie du fichier commun tandis
que son oscillateur local suit **Accord du récepteur**. Le mélange ramène la
station sélectionnée en bande de base ; le filtre passe-bas I/Q rejette les
stations qui restent hors de la bande passante du récepteur, puis le détecteur
d’enveloppe récupère le programme choisi.

Lorsqu’un programme plus court se termine, son message devient nul. L’émetteur
correspondant continue donc d’émettre une porteuse pure jusqu’à la fin du
programme le plus long.

## Points à observer

- À 0 % de profondeur, seule la porteuse subsiste.
- Augmenter la profondeur renforce les deux bandes latérales sans modifier leur
  distance à la porteuse.
- Changer le message modifie le contenu des bandes latérales, pas la fréquence
  de la porteuse.
- Au-dessus de 100 %, les passages à zéro de l’enveloppe créent une distorsion
  audible.
- Entre deux stations, le récepteur rejette progressivement les deux canaux AM.

La porteuse acoustique peut être audible comme un son continu, mais elle n’est
pas l’enregistrement source discrètement mélangé au fichier. Le message existe
dans l’enveloppe de la porteuse et doit être récupéré par un récepteur.
