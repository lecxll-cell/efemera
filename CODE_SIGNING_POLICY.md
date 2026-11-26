# Política de assinatura de código — EFÉMERA

Os artefactos de instalação são publicados a partir do repositório público
https://github.com/lecxll-cell/efemera.

## Serviço de assinatura
A assinatura de código para Windows é fornecida gratuitamente pela SignPath.io, com
certificado emitido pela SignPath Foundation, sujeita à aceitação no seu programa
open-source. Os artefactos assinados identificam a SignPath Foundation como editor.

Atribuição:
> Free code signing provided by SignPath.io, certificate by SignPath Foundation.

## Responsáveis
| Função | GitHub |
| --- | --- |
| Autor / Proprietário | @lecxll-cell |
| Revisor / Aprovador de assinaturas | @lecxll-cell |

## Processo de build e de release
- Todo o código está neste repositório público. As releases são feitas a partir de um
  commit identificado por etiqueta (ex.: `v0.4.1`).
- O build é totalmente automatizado por GitHub Actions (`.github/workflows/build.yml`):
  instala dependências, corre os testes, instala o NSIS e constrói o instalador
  `EFEMERA-Setup-<versão>.exe`, diretamente a partir do código deste repositório.
- Apenas os responsáveis acima aprovam cada pedido de assinatura em produção.

## Âmbito
Apenas o instalador `EFEMERA-Setup-<versão>.exe` e o executável `EFEMERA.exe` que ele
contém, construídos por este repositório, são assinados ao abrigo deste projeto.

## Autenticação
Todos os responsáveis usam autenticação multifator (MFA) nas contas GitHub e SignPath.
