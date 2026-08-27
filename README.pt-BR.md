# Laboratório de Modulação Acústica

**Idioma:** [English](README.md) | [Polski](README.pl.md) |
[Deutsch](README.de.md) | [Español](README.es.md) | Português (Brasil)

**O Laboratório de Modulação Acústica torna os princípios do rádio AM e FM
visíveis e audíveis diretamente em um navegador comum.**

Em vez de modular uma portadora eletromagnética, o laboratório modula uma
portadora acústica armazenada como um sinal de áudio com taxa de amostragem de
48 kHz. O meio físico é diferente, mas as equações de AM e FM e os princípios
das bandas laterais, da sintonia e da demodulação permanecem os mesmos.

[Abrir o laboratório em Português (Brasil)](https://volter2pl.github.io/acoustic-modulation-lab/?lang=pt-BR)

```text
voz ou música
      ↓
transmissor AM ou FM
      ↓
sinal acústico de alta frequência
      ↓
receptor AM ou FM sintonizado
      ↓
voz ou música recuperada
```

## O que o laboratório demonstra

Escolha um tipo de modulação e compare como cada um transmite a mesma
gravação:

| | AM | FM |
| --- | --- | --- |
| Grandeza alterada | Amplitude da portadora | Frequência instantânea |
| Parâmetro principal | Profundidade de modulação | Desvio de frequência |
| Espectro | Portadora com duas bandas laterais | Portadora com várias bandas laterais |
| Medição do receptor | Magnitude da envoltória I/Q | Variação de fase I/Q |
| Experimento adicional | Sobremodulação | RDS em escala |

O aplicativo apresenta três sinais consecutivos:

1. **Mensagem** — uma gravação incluída, seu próprio arquivo de áudio ou uma
   entrada do microfone.
2. **Sinal modulado** — a portadora AM ou FM e suas bandas laterais.
3. **Áudio recuperado** — a mensagem reconstruída pelo receptor
   correspondente.

Cada visualização é um espectrograma: o tempo avança da esquerda para a
direita, a frequência aumenta de baixo para cima e uma cor mais clara indica
mais energia. As visualizações da mensagem e do áudio recuperado cobrem de 0 a
8 kHz. A visualização do sinal modulado cobre toda a faixa de 0 a 24 kHz
disponível com uma taxa de amostragem de 48 kHz.

Para conhecer toda a teoria e as decisões de implementação:

- [Modulação de amplitude](docs/pt-BR/am.md)
- [Modulação de frequência e RDS](docs/pt-BR/fm.md)

## Uma estação e faixa de rádio

O modo **Uma estação** apresenta o controle característico do tipo de
modulação selecionado. AM permite uma profundidade de 0% a 150%, incluindo a
sobremodulação intencional. FM permite ajustar o desvio da portadora e adicionar
opcionalmente dados PS ou RadioText em escala.

O modo **Faixa de rádio** combina três estações independentes em 5, 12 e 19 kHz
em um único arquivo de áudio. Cada estação pode usar um programa e um nível de
sinal diferentes. O receptor pode ser sintonizado continuamente enquanto a
faixa compartilhada continua tocando; assim, mover o dial troca de estação em
tempo real.

O espectrograma recuperado e o arquivo WAV disponível para download são
capturas feitas na última frequência analisada. O áudio ao vivo acompanha
imediatamente o controle de sintonia; a interface identifica um espectro antigo
até que **Atualizar espectro e WAV** seja usado.

Os programas não precisam ter a mesma duração. O canal compartilhado acompanha
a gravação mais longa, enquanto uma estação AM ou FM mais curta continua como
uma portadora não modulada depois que sua mensagem termina.

## Por que isto é uma analogia

Uma portadora de radiodifusão se propaga como uma onda eletromagnética em
frequências de rádio. Este experimento usa variações de pressão do ar e
frequências de áudio para que um navegador comum possa gerar, exibir e, em
alguns casos, reproduzir o sinal.

| Transmissão de rádio | Laboratório acústico |
| --- | --- |
| Portadora eletromagnética | Portadora de pressão sonora |
| Oscilador de RF | Oscilador gerado pelo navegador |
| Antena e espaço livre | Arquivo de áudio ou alto-falante e ar |
| Receptor de rádio | Demodulador AM ou FM do navegador |

Isto não é a conversão de uma onda de rádio em som. É a mesma matemática de
modulação aplicada a outro tipo de onda.

## Experimente

Use uma das amostras incluídas, solte um arquivo de áudio ou grave sua voz. Os
navegadores normalmente aceitam WAV, MP3, M4A/AAC, OGG/Vorbis e WebM/Opus,
embora a compatibilidade exata possa variar. A entrada é limitada a 120
segundos.

Os sinais de alta frequência gerados são reproduzidos em volume reduzido e
nunca começam automaticamente. Alto-falantes, microfones, aprimoramentos de
áudio e filtros do dispositivo podem remover portadoras próximas ao limite
superior do espectro audível.

Para executar o laboratório localmente em qualquer porta livre:

```bash
npm start -- 8080
```

Depois, abra `http://localhost:8080`.

AM e FM alteram a forma como a informação é representada. Elas não
criptografam, comprimem nem ocultam a gravação original.
