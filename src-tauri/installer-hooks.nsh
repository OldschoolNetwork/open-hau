!define MUI_FINISHPAGE_LINK "$(OpenHaUQuickStart)"
!define MUI_FINISHPAGE_LINK_LOCATION "$INSTDIR\OpenHaU-Quick-Start.html"
LangString OpenHaUQuickStart 1033 "Open the Quick Start Guide"
LangString OpenHaUQuickStart 1049 "Открыть краткое руководство"
LangString OpenHaUQuickStart 1048 "Deschideți ghidul de pornire"

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\OpenHaU Database\DefaultIcon" "" '$\"$INSTDIR\database.ico$\",0'
  !insertmacro UPDATEFILEASSOC
!macroend
