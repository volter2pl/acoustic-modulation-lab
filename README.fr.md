# Laboratoire de modulation acoustique

**Langue :** [English](README.md) | [Polski](README.pl.md) |
[Deutsch](README.de.md) | [Español](README.es.md) |
[Português (Brasil)](README.pt-BR.md) | [简体中文](README.zh-CN.md) |
[日本語](README.ja.md) | Français

**Le Laboratoire de modulation acoustique rend les principes de la radio AM et
FM visibles et audibles dans un navigateur ordinaire.**

Au lieu de moduler une porteuse électromagnétique, le laboratoire module une
porteuse acoustique stockée sous forme d’onde audio à 48 kHz. Le milieu physique
est différent, mais les équations AM et FM ainsi que les principes des bandes
latérales, de l’accord et de la démodulation restent identiques.

[Ouvrir le laboratoire en français](https://volter2pl.github.io/acoustic-modulation-lab/?lang=fr)

```text
voix ou musique
      ↓
émetteur AM ou FM
      ↓
forme d’onde acoustique haute fréquence
      ↓
récepteur AM ou FM accordé
      ↓
voix ou musique récupérée
```

## Ce que démontre le laboratoire

Choisissez une modulation et comparez la manière dont chacune inscrit le même
enregistrement dans une porteuse :

| | AM | FM |
| --- | --- | --- |
| Grandeur modifiée | Amplitude de la porteuse | Fréquence instantanée |
| Réglage principal | Profondeur de modulation | Déviation de fréquence |
| Spectre | Porteuse et deux bandes latérales | Porteuse et plusieurs bandes latérales |
| Mesure du récepteur | Module de l’enveloppe I/Q | Variation de phase I/Q |
| Expérience supplémentaire | Surmodulation | RDS mis à l’échelle |

L’application présente trois signaux successifs :

1. **Message** — un enregistrement fourni, votre fichier audio ou l’entrée du
   microphone.
2. **Signal modulé** — la porteuse AM ou FM et ses bandes latérales.
3. **Audio récupéré** — le message reconstruit par le récepteur correspondant.

Chaque visualisation est un spectrogramme : le temps va de gauche à droite, la
fréquence augmente de bas en haut et une couleur plus claire indique davantage
d’énergie. Les vues du message et de l’audio récupéré couvrent 0–8 kHz. Celle du
signal modulé couvre toute la plage 0–24 kHz disponible avec un échantillonnage
à 48 kHz.

Pour la théorie complète et les choix d’implémentation, consultez :

- [Modulation d’amplitude](docs/fr/am.md)
- [Modulation de fréquence et RDS](docs/fr/fm.md)

## Une station et bande radio

Le mode **Une station** donne accès au réglage caractéristique de la modulation
choisie. L’AM permet une profondeur de 0 % à 150 %, y compris une
surmodulation volontaire. La FM permet de régler la déviation de la porteuse et
d’ajouter éventuellement des données PS ou RadioText mises à l’échelle.

Le mode **Bande radio** combine trois stations indépendantes dans un seul
fichier audio. Leurs porteuses sont réglées par défaut sur 5, 12 et 19 kHz.
Chaque station possède son propre programme, son niveau de signal, une
fréquence porteuse de 4 à 20 kHz par pas de 0,1 kHz et une phase au récepteur de
0° à 345° par pas de 15°. Le récepteur peut être accordé en continu pendant la
lecture de la bande commune : déplacer le curseur change donc de station en
temps réel.

Les porteuses peuvent être rapprochées ou réglées sur la même fréquence. Les
canaux qui se chevauchent interfèrent et ne peuvent pas être séparés par le seul
accord. Pour des signaux cocanaux identiques, la phase relative détermine si
leurs formes d’onde se renforcent ou s’annulent.

Le spectrogramme récupéré et le fichier WAV téléchargeable sont des instantanés
créés à la dernière fréquence analysée. L’audio en direct suit immédiatement le
curseur d’accord ; l’interface signale qu’un spectre est ancien jusqu’à
l’utilisation de **Mettre à jour le spectre et le WAV**.

Les programmes ne doivent pas nécessairement avoir la même durée. Le canal
commun suit l’enregistrement le plus long ; lorsqu’un programme AM ou FM plus
court se termine, sa station continue sous forme de porteuse non modulée.

## Pourquoi s’agit-il d’une analogie

Une porteuse de radiodiffusion se propage comme une onde électromagnétique à
des fréquences radio. Cette expérience utilise les variations de pression de
l’air et des fréquences audio afin qu’un navigateur ordinaire puisse produire,
afficher et parfois reproduire le signal.

| Transmission radio | Laboratoire acoustique |
| --- | --- |
| Porteuse électromagnétique | Porteuse de pression acoustique |
| Oscillateur RF | Oscillateur généré par le navigateur |
| Antenne et espace libre | Fichier audio ou haut-parleur et air |
| Récepteur radio | Démodulateur AM ou FM du navigateur |

Il ne s’agit pas de convertir une onde radio en son, mais d’appliquer les mêmes
mathématiques de modulation à une autre catégorie d’onde.

## Essayez l’expérience

Utilisez un exemple fourni, déposez un fichier audio ou enregistrez votre voix.
Les navigateurs prennent généralement en charge WAV, MP3, M4A/AAC, OGG/Vorbis
et WebM/Opus, mais la compatibilité exacte varie. La durée d’entrée est limitée
à 120 secondes.

Les signaux haute fréquence générés sont lus à volume réduit et ne démarrent
jamais automatiquement. Les haut-parleurs, microphones, traitements audio et
filtres de l’appareil peuvent supprimer les porteuses proches de la limite
supérieure du spectre audible.

Pour exécuter le laboratoire localement sur un port libre :

```bash
npm start -- 8080
```

Ouvrez ensuite `http://localhost:8080`.

L’AM et la FM changent la manière de représenter l’information. Elles ne
chiffrent, ne compressent et ne dissimulent pas l’enregistrement source.
