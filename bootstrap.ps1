Set-Location "c:\Users\italo\OneDrive\Desktop\apps\controle-financeiro"
npm install react-router-dom lucide-react recharts date-fns
New-Item -ItemType Directory -Force -Path "src/components"
New-Item -ItemType Directory -Force -Path "src/pages"
New-Item -ItemType Directory -Force -Path "src/context"
New-Item -ItemType Directory -Force -Path "src/utils"
New-Item -ItemType Directory -Force -Path "src/types"

$pages = @("Dashboard", "Receitas", "Despesas", "Contas", "Cartoes", "Metas", "Investimentos", "Configuracoes")
foreach ($page in $pages) {
    $content = "import React from 'react';`nexport default function $page() { return (<div><div className=`"page-header`"><h1 className=`"page-title`">$page</h1></div></div>); }"
    Set-Content -Path "src\pages\$page.tsx" -Value $content -Encoding UTF8
}

$sidebarContent = "import React from 'react';`nexport default function Sidebar() { return (<aside className=`"sidebar`">Sidebar Component</aside>); }"
Set-Content -Path "src\components\Sidebar.tsx" -Value $sidebarContent -Encoding UTF8

$contextContent = "import React, { createContext, PropsWithChildren } from 'react';`nexport const FinanceContext = createContext({});`nexport function FinanceProvider({children}: PropsWithChildren) { return <FinanceContext.Provider value={{}}>{children}</FinanceContext.Provider>; }"
Set-Content -Path "src\context\FinanceContext.tsx" -Value $contextContent -Encoding UTF8

Remove-Item -Path "src\App.css" -ErrorAction SilentlyContinue
Remove-Item -Path "src\assets" -Recurse -Force -ErrorAction SilentlyContinue
