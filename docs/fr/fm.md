# Modulation de fréquence et RDS

**Langue :** [English](../en/fm.md) | [Polski](../pl/fm.md) |
[Deutsch](../de/fm.md) | [Español](../es/fm.md) |
[Português (Brasil)](../pt-BR/fm.md) | [简体中文](../zh-CN/fm.md) |
[日本語](../ja/fm.md) | Français

[Retour à la présentation du laboratoire](../../README.fr.md)

La modulation de fréquence inscrit un message dans la fréquence instantanée
d’une porteuse d’amplitude constante. Contrairement à l’AM, l’enveloppe de la
porteuse ne suit pas directement le programme.

## Comment la FM stocke un message

Soient `m(t)` le message normalisé, `fc` la porteuse et `Δf` la déviation de
fréquence maximale :

```text
fi(t) = fc + Δf · m(t)
```

Pour une porteuse à 18 kHz et une déviation de ±1 kHz :

```text
m(t) = -1,0  →  fi(t) = 17 kHz
m(t) =  0,0  →  fi(t) = 18 kHz
m(t) = +1,0  →  fi(t) = 19 kHz
```

La fréquence est la dérivée de la phase. Une FM discrète correcte accumule
donc continuellement la phase de l’oscillateur :

```text
phase += 2π · fréquenceInstantanée / fréquenceÉchantillonnage
échantillonFm = sin(phase)
```

Calculer un nouveau sinus indépendant à partir de la fréquence et du temps
absolu créerait des discontinuités de phase et ne produirait pas une FM
correcte.

## Fonctionnement du récepteur FM

Le récepteur mélange le signal avec des oscillateurs sinus et cosinus accordés
sur la porteuse sélectionnée. Après filtrage, les composantes forment un signal
complexe en bande de base :

```text
z[n] = I[n] + jQ[n]
```

Le récepteur mesure la variation de phase entre deux échantillons successifs :

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
m[n] ≈ Δφ[n] · fréquenceÉchantillonnage / (2π · Δf)
```

Ce discriminateur I/Q récupère la déviation de fréquence sans étape distincte
de déroulement de phase. Un filtre passe-bas de programme ne conserve que
l’enregistrement d’origine.

## Bande passante FM

La plage instantanée correspond seulement à la porteuse plus ou moins la
déviation. Un signal FM comporte aussi des bandes latérales ; l’expérience
utilise donc l’estimation pratique de Carson :

```text
largeur de bande FM occupée ≈ 2 · (déviation + largeur de bande du message)
```

L’audio d’une station unique est limité à une bande vocale de 2,4 kHz.
L’interface refuse les combinaisons de porteuse et de déviation dont les bandes
latérales estimées franchiraient la limite inférieure du spectre ou la fréquence
de Nyquist de 24 kHz.

## RDS mis à l’échelle

Le RDS montre que l’audio du programme et des informations numériques peuvent
moduler simultanément la même porteuse FM. Dans un multiplex FM stéréo réel, le
RDS utilise une sous-porteuse supprimée à 57 kHz, soit exactement trois fois le
pilote stéréo de 19 kHz, et un débit de 1187,5 bit/s.

Un fichier audio à 48 kHz ne peut pas représenter 57 kHz. Toutes les fréquences
d’horloge RDS sont donc divisées par huit en conservant leurs rapports :

| Composante | RDS de radiodiffusion | Modèle acoustique |
| --- | ---: | ---: |
| Pilote | 19 kHz | 2,375 kHz |
| Sous-porteuse RDS | 57 kHz | 7,125 kHz |
| Débit de données | 1187,5 bit/s | 148,4375 bit/s |

Les modes disponibles sont :

- **Aucun** — audio du programme uniquement ;
- **PS** — nom de service de programme sur huit caractères dans des groupes 0A ;
- **RadioText** — jusqu’à 64 caractères dans des groupes 2A.

Les champs PS et RadioText acceptent les caractères ASCII imprimables. Un texte
non pris en charge est signalé avant l’encodage au lieu d’être modifié en silence.

Le modèle produit les blocs et mots de contrôle RDS, le codage différentiel et
les symboles biphase. Le récepteur récupère des groupes valides dans la forme
d’onde démodulée ; le texte n’est pas stocké comme métadonnée du WAV. Si la
source est trop courte pour un cycle de données complet, du silence prolonge le
programme pendant la transmission.

Dans cette implémentation pédagogique, les champs texte RDS utilisent des
caractères ASCII imprimables codés sur un octet. Les caractères accentués ne
sont donc pas transmis directement ; le RadioText français par défaut omet les
accents.

Après démodulation, le multiplex complet alimente le décodeur de données. Un
chemin d’écoute séparé retire le pilote mis à l’échelle et applique un filtre
passe-bas raide au programme : le lecteur d’audio récupéré contient donc le
programme et non les tonalités RDS.

Le RDS exige une bande de base bien plus large et réduit par conséquent la
plage sûre de porteuses acoustiques. Il s’agit d’une forme d’onde pédagogique
mise à l’échelle, qu’un récepteur RDS commercial ne peut pas décoder.

## Plusieurs stations FM

Le mode bande radio combine des porteuses à 5, 12 et 19 kHz. Chaque station
utilise une déviation de ±0,75 kHz et une bande de programme de 2 kHz :

```text
5 kHz FM  ─┐
12 kHz FM ─┼─→ une bande radio acoustique
19 kHz FM ─┘
```

La largeur de canal estimée est d’environ 5,5 kHz, ce qui maintient un
espacement entre les stations. Le récepteur en direct change continuellement
son oscillateur local pendant la lecture de la bande commune : l’accord se
comporte donc comme le bouton d’un poste de radio.

Le RDS est désactivé dans le mode bande radio. Dans le modèle à l’échelle 1:8,
une seule station RDS occupe environ 17,2 kHz ; plusieurs canaux RDS fidèles ne
tiendraient pas dans le spectre audio disponible de 0 à 24 kHz.

Lorsqu’un programme se termine, son message devient nul et la station continue
sous forme de porteuse non modulée. Les commandes de niveau modifient la
puissance de chaque station, tandis que le mélangeur réserve une marge pour les
trois émetteurs.

Le récepteur utilise un filtre de canal raide en bande de base complexe et
n’applique pas de squelch. Une station isolée s’atténue lorsqu’elle quitte le
canal sélectionné. Entre deux canaux occupés, des parties des deux spectres
peuvent entrer dans le filtre ; la capture, les interférences et le son déformé
restent donc audibles. Le discriminateur limite les sauts de phase extrêmes afin
d’éviter l’écrêtage.

## Points à observer

- Les porteuses basses s’entendent plus facilement comme un sifflement variable.
- Une déviation plus grande étale l’énergie plus loin de la porteuse.
- L’amplitude de la porteuse reste constante tandis que la vitesse de ses cycles
  varie.
- Le RDS crée des composantes multiplex haute fréquence visibles avant la
  modulation FM.
- Entre les stations, on entend l’atténuation, la capture et les interférences,
  plutôt qu’une coupure automatique.

La FM n’est pas une copie discrète de la source cachée sous une tonalité. C’est
une forme d’onde continue dont la phase accumulée transporte l’enregistrement.
