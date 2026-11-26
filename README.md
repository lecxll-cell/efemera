# EFÉMERA — avisos de efemérides por e-mail (Windows)

Serviço de Património Cultural - Município de Mirandela

Aplicação para **um único computador**, sem servidor: envia os avisos **através do Outlook clássico** instalado nesse computador (não funciona com o «novo Outlook»).

## ⬇️ Descarregar

**[Descarregar a última versão — Windows 10/11](https://github.com/lecxll-cell/efemera/releases/latest)**

🛡️ **Verificado:** análise antivírus no [VirusTotal](https://www.virustotal.com/gui/file/3a1ff7b058e3a57f213e4269954b36fcb4321d37e34e0f4aa2491a7f5a320ea2) — limpo nos principais antivírus, incluindo o **Microsoft Defender**.

Instalação por utilizador (sem administrador). Requer o Outlook clássico instalado e configurado.
Como ainda não tem assinatura digital, o Windows pode mostrar o SmartScreen: **"Mais informações" → "Executar à mesma"**.

## Como funcionam os avisos
- **Período de avisos:** de *data − antecedência* até à data. A antecedência é de **90 dias no mínimo** (máximo 365), definida nas Definições e ajustável em cada efeméride.
- **Frequência dos avisos** (nas Definições e em cada efeméride): *Diários* (até a efeméride ser posta em suspensão ou chegar a data) · *Dias de semana* · *Dia sim, dia não* · *Semana a semana* · *De 15 em 15 dias* · *De mês a mês*. Predefinição: Semana a semana.
- As efemérides repetem-se **todos os anos** (29/fev → 28/fev nos anos comuns). Hora de envio configurável e um só destinatário. **Um só e-mail por dia**: se nesse dia houver mais do que uma efeméride, vão todos os alertas no mesmo e-mail; se houver apenas uma, o e-mail é só dessa.
- **Anos de aniversário:** cada efeméride mostra quantos anos faz **no ano corrente** (na ficha e na tabela). Múltiplos de 25 são marcos (50 cinquentenário, 100 centenário, 150 sesquicentenário…) e aparecem com ★ e no assunto do e-mail.
- **Texto** opcional (máximo 250 palavras) em cada efeméride.
- O e-mail indica a data, os dias que faltam, o tipo, os anos de aniversário, «aviso 3 de 13» e o próximo aviso. Cada aviso gera também uma notificação do Windows.
- **Anuário:** separador com todas as efemérides distribuídas pelos meses do ano (verde: avisos ativos · laranja: em hibernação · vermelho: suspensas), com filtros por tipo. **Todos os e-mails de aviso levam também o Anuário** no fim.

## Estados da efeméride
| Estado | Significa |
|---|---|
| **Ativo (saído da hibernação, deverá começar a ser notificado)** | Normal: é avisada nas datas definidas. |
| **Ativo (em hibernação)** | Os avisos do ciclo em curso ficam adormecidos até ao ano seguinte e reativam-se sozinhos quando abre o período de avisos do ano seguinte (a 90 dias da data, com a antecedência por defeito). |
| **Suspenso (indefinidamente)** | Nunca avisa, até o utilizador mudar o estado. |

Só se deixa de avisar de vez **eliminando** a efeméride ou deixando-a **Suspenso (indefinidamente)**. A hibernação pode ser desligada em Definições.

## Tipos
Acontecimentos históricos · Dias nacionais e internacionais · Distinções e condecorações · Documentos históricos · Encontros, palestras e jornadas · Inscrições e Categorias de classificação · Instituições e coletividades · Pessoas · Práticas rituais, sociais e eventos festivos · Outro.

## Porque não falha
| Situação | Comportamento |
|---|---|
| Computador desligado num dia de aviso | Ao ligar (depois da hora) o aviso sai e indica os dias em falta. Se ligar num dia sem aviso previsto, sai **um** aviso em atraso, uma só vez por falha. |
| Efeméride criada (ou calendário alterado) a meio do período | Os avisos anteriores não contam como falhados. |
| Desligado até depois da data | Não envia, mas fica registado como «aviso perdido» em Estado (30 dias). |
| Outlook indisponível / sem resposta | O e-mail fica numa fila guardada em disco e repete-se (1, 2, 5, 10, 15, 30 min, depois de hora a hora, ~2 dias). Notificação do Windows à 3.ª falha e se desistir. |
| Reinício, falha de energia, fechar a janela | Nada se duplica nem se perde. Fechar a janela mantém a app em segundo plano. |
| Ficheiro de dados danificado | Recuperação automática da cópia diária (últimos 30 dias). |
| Falta o e-mail do destinatário, efeméride sem data… | Aparece a vermelho/amarelo em **Estado** e na etiqueta de estado. |

**Todos os anos** (1.º dia do ano) a app limpa o histórico dos avisos (registo, e-mails enviados, avisos perdidos); as efemérides ficam.

## Instalar
Ver o **Guia de instalação passo a passo** (documento à parte) e usar `EFEMERA-Setup-0.4.1.exe` (sem administrador). **Requisito:** Outlook **clássico** instalado e com a conta configurada.

## Para quem desenvolve
`npm ci` · `npm test` · `npm run build:win` (gera `dist\EFEMERA-Setup-0.4.1.exe`; precisa do [NSIS](https://nsis.sourceforge.io) no PATH).
Teste da app inteira em Linux (ecrã virtual, envio simulado): `EFEMERA_SMOKE=1 EFEMERA_DATA=/tmp/x xvfb-run electron . --no-sandbox`.

## Limites conhecidos
- Só avisa enquanto o utilizador tem sessão iniciada no Windows (a app arranca com o Windows, em segundo plano).
- O envio pelo Outlook foi verificado por simulação; falta validá-lo num Windows real. Se o Outlook pedir autorização para a «aplicação enviar e-mail em seu nome», é a proteção do Outlook/antivírus: pedir à informática para autorizar.
- Se o Outlook estiver sem rede, a mensagem fica na Caixa de Saída do Outlook e segue quando houver ligação.
- Instalador sem assinatura digital: o Windows SmartScreen pode avisar.

## Créditos e direitos
EFÉMERA — concebida por |ªLºP, com recurso a inteligência artificial, para uso do Serviço de Património Cultural do Município de Mirandela.

© 2026 |ªLºP. Criado com recurso a inteligência artificial, para uso do Serviço de Património Cultural do Município de Mirandela.

Distribuído sob a licença **MIT** (software livre e de código aberto). Ver o ficheiro `LICENSE`.
