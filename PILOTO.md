# Piloto EFÉMERA — 4 semanas, num computador real

**Objetivo:** provar, em condições reais, que os avisos chegam sempre.

## Antes de começar (dia 0)
- [ ] Windows 10/11; **Outlook clássico** instalado e com a conta funcional (enviar um e-mail normal de teste a partir do Outlook).
- [ ] A informática permite instalar sem administrador e não bloqueia o instalador.
- [ ] O técnico regista **pelo menos 10 efemérides com data real**; 3 delas com janela de avisos a decorrer nas próximas 2 semanas (ajustar datas de teste, antecedência ≥ 90 dias), testando as várias frequências dos avisos.

## Semana a semana
| Semana | Foco | Tarefas |
|---|---|---|
| 1 | Instalação e primeiros avisos | Instalar, configurar, «Enviar e-mail de teste», 1.º aviso diário + notificação do Windows. |
| 2 | Falhas provocadas | Testes T1–T10. Registar o resultado. |
| 3 | Uso normal | Preencher efemérides reais; usar **hibernar** e **suspender**; observar «Estado» e «Agenda». |
| 4 | Decisão | Rever métricas e falhas. Decidir: instalar / corrigir e repetir. |

## Testes de aceitação em Windows (semana 2)
| # | Teste | Resultado esperado |
|---|---|---|
| T1 | Instalar sem direitos de administrador | Instala; arranca com o Windows em segundo plano |
| T2 | Enviar o **e-mail de teste** | Chega; aparece nos Itens enviados do Outlook |
| T3 | Desligar o PC de véspera e ligar a meio da manhã | Aviso sai ao ligar; refere o dia em atraso, se for o caso |
| T4 | Desligar o PC durante toda uma janela de avisos (efeméride de teste) | Sai **um** aviso em atraso; sem duplicados |
| T5 | Fechar o Outlook / ficar sem rede e depois repor | E-mail fica «a repetir»; notificação à 3.ª falha; entrega ao repor, uma só vez |
| T6 | Fechar a janela (X) e deixar **24 h** sem tocar | Notificação e e-mail do dia saem à hora certa |
| T7 | Pôr uma efeméride **Ativo (em hibernação)** | Não avisa; em «Estado» e na tabela aparece «Adormecida até…»; reativa na data prevista |
| T8 | **Suspenso (indefinidamente)** e depois voltar a «Ativo» | Não avisa enquanto suspensa; volta a avisar ao reativar |
| T9 | Suspender/retomar o portátil por cima da hora de envio | Aviso sai pouco depois de retomar |
| T10 | Efeméride com marco redondo (ex.: 100 anos) e calculadora de anos | O e-mail traz «Anos de aniversário» e o assunto o marco |

## Métricas
Avisos esperados vs **recebidos** (alvo 100%) · duplicados (alvo 0) · tempo de instalação + configuração (< 30 min) · problemas em «Estado».

## Critérios para avançar
1. 100% dos avisos esperados recebidos (ou falhas provocadas e já corrigidas). 2. T1–T10 aprovados. 3. O técnico usa sem apoio após a semana 1. 4. A informática confirma a instalação e o comportamento do Outlook.
