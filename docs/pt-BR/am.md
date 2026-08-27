# Modulação de amplitude

**Idioma:** [English](../en/am.md) | [Polski](../pl/am.md) |
[Deutsch](../de/am.md) | [Español](../es/am.md) | Português (Brasil) |
[简体中文](../zh-CN/am.md)

[Voltar para a descrição do laboratório](../../README.pt-BR.md)

A modulação de amplitude armazena uma mensagem na envoltória variável de uma
portadora. O experimento usa AM convencional de banda lateral dupla com
portadora transmitida, a forma historicamente associada à radiodifusão AM e aos
detectores de envoltória simples.

## Como a AM armazena uma mensagem

Sejam `m(t)` uma mensagem normalizada para o intervalo `[-1, 1]`, `fc` a
frequência da portadora e `μ` a profundidade de modulação:

```text
s(t) = A · [1 + μm(t)] · cos(2πfc t)
```

A portadora continua oscilando em `fc`; somente sua amplitude muda. Com
profundidade de 80%, `μ = 0.8`:

```text
m(t) = -1.0  →  envoltória = 0.2A
m(t) =  0.0  →  envoltória = 1.0A
m(t) = +1.0  →  envoltória = 1.8A
```

Em 0%, o arquivo contém uma portadora não modulada e nenhuma mensagem. Em 100%,
a envoltória chega exatamente a zero no pico negativo da mensagem.

## Portadora e bandas laterais

Uma mensagem senoidal na frequência `fm` cria três componentes espectrais
nítidos:

```text
banda lateral inferior   portadora   banda lateral superior
       fc - fm              fc              fc + fm
```

Voz e música reais contêm muitas frequências, produzindo bandas laterais
inferior e superior espelhadas ao redor da portadora. Se a mensagem estiver
limitada à largura de banda `B`, a AM convencional ocupa aproximadamente:

```text
largura de banda AM ocupada = 2B
```

O laboratório limita a mensagem de uma única estação a 2,4 kHz, produzindo um
canal AM com cerca de 4,8 kHz. Assim, as duas bandas laterais cabem de forma
fiel abaixo da frequência de Nyquist de 24 kHz de um arquivo de áudio com taxa
de 48 kHz.

## Sobremodulação

Quando a profundidade ultrapassa 100%, parte de `1 + μm(t)` se torna negativa.
A portadora matemática muda de fase em 180 graus a cada cruzamento por zero da
envoltória, mas um detector de envoltória mede a magnitude e não consegue
preservar esse sinal:

```text
envoltória medida = |1 + μm(t)|
```

O resultado é distorção. A interface permite deliberadamente valores de até
150% e os identifica como **Sobremodulada**, em vez de bloqueá-los. Isso torna
um limite fundamental da AM visível no espectro modulado e audível na gravação
recuperada.

## Como o receptor funciona

Primeiro, o receptor mistura a forma de onda AM real com osciladores de cosseno
e seno na frequência da portadora selecionada. Filtros passa-baixas deixam as
componentes em fase e em quadratura:

```text
z[n] = I[n] + jQ[n]
```

A magnitude delas é a envoltória:

```text
envoltória[n] = sqrt(I[n]² + Q[n]²)
```

Um bloqueador de componente contínua remove o nível constante da portadora, e
um filtro passa-baixas do programa remove os termos residuais de alta
frequência. O estágio de entrada em quadratura se comporta como um receptor de
envoltória idealmente sintonizado: ele seleciona uma portadora antes de medir
sua amplitude e funciona mesmo quando a fase do oscilador não está alinhada à
do transmissor.

## Várias estações AM

O modo de faixa de rádio cria três estações AM convencionais:

```text
5 kHz AM  ─┐
12 kHz AM ─┼─→ uma faixa de rádio acústica
19 kHz AM ─┘
```

Cada programa é limitado a 2 kHz e transmitido com profundidade de 80%. Uma
estação ocupa, portanto, aproximadamente 4 kHz, deixando espaço entre
portadoras vizinhas. O nível das três formas de onda é reduzido antes da soma
para impedir que o arquivo combinado sature.

O receptor ao vivo mantém a linha do tempo do arquivo comum em andamento
enquanto seu oscilador local acompanha a **Sintonia do receptor**. A mistura
desloca a estação selecionada para a banda base; o filtro passa-baixas I/Q
rejeita as estações que permanecem fora da banda passante do receptor, e o
detector de envoltória recupera o programa escolhido.

Quando um programa mais curto termina, sua mensagem passa a ser zero. O
transmissor correspondente continua como uma portadora pura até o fim do
programa mais longo.

## O que observar

- Em 0%, somente a portadora permanece.
- Aumentar a profundidade fortalece as duas bandas laterais sem alterar a
  distância delas até a portadora.
- Mudar a mensagem altera o conteúdo das bandas laterais, não a frequência da
  portadora.
- Acima de 100%, os cruzamentos por zero da envoltória produzem distorção
  audível.
- Entre as estações, o receptor rejeita progressivamente os dois canais AM.

A portadora acústica pode ser ouvida como um tom constante, mas não é uma cópia
silenciosa da gravação original misturada ao arquivo. A mensagem existe na
envoltória da portadora e precisa ser recuperada por um receptor.
