Unicode true
!include "MUI2.nsh"
!define NOME "EFÉMERA"
!define VERSAO "0.4.1" ; manter igual à versão do package.json
Name "${NOME}"
OutFile "..\dist\EFEMERA-Setup-${VERSAO}.exe"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\EFEMERA"
SetCompressor /SOLID lzma
BrandingText "PO |ªLºP, Dev AI, para: Serviço de Património Cultural do Município de Mirandela"
!define MUI_ICON "..\assets\icon.ico"
!define MUI_UNICON "..\assets\icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\EFEMERA.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir a EFÉMERA agora"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Portuguese"

Section "Instalar"
  nsExec::Exec 'taskkill /im EFEMERA.exe /f'
  Pop $0
  Sleep 800
  RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "..\dist\win-unpacked\*.*"
  File "..\assets\icon.ico"
  CreateShortcut "$DESKTOP\EFÉMERA.lnk" "$INSTDIR\EFEMERA.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\EFÉMERA.lnk" "$INSTDIR\EFEMERA.exe" "" "$INSTDIR\icon.ico" 0
  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "DisplayName" "${NOME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "DisplayVersion" "${VERSAO}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "Publisher" "PO |ªLºP, Dev AI, para: Serviço de Património Cultural do Município de Mirandela"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /im EFEMERA.exe /f'
  Pop $0
  Pop $0
  Sleep 500
  Delete "$DESKTOP\EFÉMERA.lnk"
  Delete "$SMPROGRAMS\EFÉMERA.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EFEMERA"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "EFEMERA"
SectionEnd
