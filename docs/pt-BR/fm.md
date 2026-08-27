# Modulação de frequência e RDS

**Idioma:** [English](../en/fm.md) | [Polski](../pl/fm.md) |
[Deutsch](../de/fm.md) | [Español](../es/fm.md) | Português (Brasil) |
[简体中文](../zh-CN/fm.md) | [日本語](../ja/fm.md)

[Voltar para a descrição do laboratório](../../README.pt-BR.md)

A modulação de frequência armazena uma mensagem na frequência instantânea de
uma portadora de amplitude constante. Ao contrário da AM, a envoltória da
portadora não acompanha diretamente o programa.

## Como a FM armazena uma mensagem

Sejam `m(t)` a mensagem normalizada, `fc` a frequência da portadora e `Δf` o
desvio máximo de frequência:

```text
fi(t) = fc + Δf · m(t)
```

Para uma portadora de 18 kHz e um desvio de ±1 kHz:

```text
m(t) = -1.0  →  fi(t) = 17 kHz
m(t) =  0.0  →  fi(t) = 18 kHz
m(t) = +1.0  →  fi(t) = 19 kHz
```

A frequência é a derivada da fase. Por isso, uma FM discreta correta acumula
continuamente a fase do oscilador:

```text
phase += 2π · instantaneousFrequency / sampleRate
fmSample = sin(phase)
```

Calcular um novo seno independente a partir da frequência e do tempo absoluto
criaria descontinuidades de fase e não produziria uma FM correta.

## Como o receptor FM funciona

O receptor mistura o sinal com osciladores de seno e cosseno na frequência da
portadora selecionada. Depois da filtragem, as componentes formam um sinal
complexo de banda base:

```text
z[n] = I[n] + jQ[n]
```

O receptor mede a variação de fase entre amostras adjacentes:

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
m[n] ≈ Δφ[n] · sampleRate / (2π · Δf)
```

Esse discriminador I/Q recupera o desvio de frequência sem uma etapa separada
de desenrolamento de fase. Um filtro passa-baixas do programa deixa a gravação
original.

## Largura de banda da FM

A faixa instantânea é apenas a portadora mais ou menos o desvio. Um sinal FM
também tem bandas laterais, por isso o experimento usa a útil estimativa de
Carson:

```text
largura de banda FM ocupada ≈ 2 · (desvio + largura de banda da mensagem)
```

O áudio de uma única estação é limitado a uma faixa de voz de 2,4 kHz. A
interface rejeita combinações de portadora e desvio cujas bandas laterais
estimadas cruzem o limite inferior do espectro ou o limite de Nyquist de
24 kHz.

## RDS em escala

O RDS demonstra que o áudio do programa e as informações digitais podem
modular simultaneamente a mesma portadora FM. Em um multiplex FM estéreo real,
o RDS usa uma subportadora suprimida de 57 kHz — exatamente três vezes o piloto
estéreo de 19 kHz — e uma taxa de dados de 1187,5 bit/s.

Um arquivo de áudio com taxa de 48 kHz não pode representar 57 kHz. Por isso,
todos os relógios do RDS são divididos por oito, preservando sua relação:

| Componente | RDS de radiodifusão | Modelo acústico |
| --- | ---: | ---: |
| Piloto | 19 kHz | 2,375 kHz |
| Subportadora RDS | 57 kHz | 7,125 kHz |
| Taxa de dados | 1187,5 bit/s | 148,4375 bit/s |

Os modos disponíveis são:

- **Nenhum** — somente áudio do programa;
- **PS** — um nome de estação Programme Service com oito caracteres em grupos
  0A;
- **RadioText** — até 64 caracteres em grupos 2A.

O modelo gera blocos RDS, palavras de verificação, codificação diferencial e
símbolos bifásicos. O receptor recupera grupos válidos da forma de onda
demodulada; o texto não é armazenado como metadados WAV. Se a fonte for curta
demais para um ciclo de dados completo, um trecho de áudio silencioso prolonga
a transmissão.

Depois da demodulação, o multiplex completo alimenta o decodificador de dados.
Um caminho de escuta separado remove o piloto em escala e aplica um filtro
passa-baixas acentuado ao programa. Assim, o reprodutor de áudio recuperado
contém o programa, e não os tons do RDS.

O RDS exige uma banda base muito mais larga e, consequentemente, reduz a faixa
segura da portadora acústica. Esta é uma forma de onda educacional em escala,
não uma forma que um receptor RDS comercial possa decodificar.

## Várias estações FM

O modo de faixa de rádio combina portadoras em 5, 12 e 19 kHz. Cada estação usa
um desvio de ±0,75 kHz e uma faixa de programa de 2 kHz:

```text
5 kHz FM  ─┐
12 kHz FM ─┼─→ uma faixa de rádio acústica
19 kHz FM ─┘
```

A largura estimada do canal é de aproximadamente 5,5 kHz, deixando separação
entre as estações. O receptor ao vivo altera continuamente seu oscilador local
enquanto a faixa comum continua tocando; assim, a sintonia se comporta como o
dial de um rádio.

O RDS fica desativado no modo de faixa de rádio. No modelo em escala 1:8, uma
estação RDS ocupa aproximadamente 17,2 kHz; vários canais RDS representados com
fidelidade não caberiam no espectro de áudio disponível de 0 a 24 kHz.

Quando um programa termina, sua mensagem passa a ser zero, e a estação continua
como uma portadora não modulada. Os controles de nível do sinal alteram a força
de cada estação, enquanto o mixer reserva margem para os três transmissores.

## O que observar

- Portadoras mais baixas são mais fáceis de ouvir como um assobio variável.
- Um desvio maior espalha a energia para mais longe da portadora.
- A portadora permanece com amplitude constante enquanto sua velocidade de
  oscilação muda.
- O RDS cria componentes multiplex visíveis de alta frequência antes da
  modulação FM.
- Entre as estações, o receptor rejeita portadoras fora de seu filtro de banda
  base.

FM não é uma cópia silenciosa da fonte escondida sob um tom. É uma única forma
de onda contínua cuja fase acumulada transporta a gravação.
