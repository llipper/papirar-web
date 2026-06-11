# gerar_estatuto_da_pessoa_com_deficiencia_json.ps1
# Gera estatuto_da_pessoa_com_deficiencia.json a partir do TXT e preserva
# audios no formato separado: audioId no JSON principal + *_audio.json.
# Uso: powershell -ExecutionPolicy Bypass -File gerar_estatuto_da_pessoa_com_deficiencia_json.ps1

[CmdletBinding()]
param(
    [int]$MaxArticles = 0,
    [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$baseDir = $PSScriptRoot
$txtPath = Join-Path $baseDir 'estatuto_da_pessoa_com_deficiencia.txt'
$outJsonPath = Join-Path $baseDir 'estatuto_da_pessoa_com_deficiencia.json'
$audioJsonPath = Join-Path $baseDir 'estatuto_da_pessoa_com_deficiencia_audio.json'
$bakPath = "$outJsonPath.bak"

if (-not (Test-Path $txtPath)) {
    throw "Arquivo fonte nao encontrado: $txtPath"
}

if ((Test-Path $outJsonPath) -and -not $NoBackup) {
    Copy-Item -Path $outJsonPath -Destination $bakPath -Force
    Write-Host "Backup criado: $bakPath" -ForegroundColor DarkGray
}

Write-Host "Lendo TXT do Estatuto da Pessoa com Deficiencia..." -ForegroundColor Cyan
$lines = [System.IO.File]::ReadAllLines($txtPath)
$totalLines = $lines.Length
Write-Host "  $totalLines linhas carregadas." -ForegroundColor DarkGray

$audioCatalog = @{}
if (Test-Path $audioJsonPath) {
    $audioRaw = Get-Content -Raw $audioJsonPath
    if (-not [string]::IsNullOrWhiteSpace($audioRaw)) {
        $audioJson = $audioRaw | ConvertFrom-Json
        foreach ($prop in $audioJson.PSObject.Properties) {
            $audioCatalog[$prop.Name] = $true
        }
    }
}

function Clean-Text([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return '' }
    $value = $text.Trim()
    # Full HTML entity decode (handles &#160; = &nbsp;, &#8211; = –, etc. from .htm/ePUB/XHTML/Planalto sources)
    $value = [System.Net.WebUtility]::HtmlDecode($value)
    # Remove residual "o " / "º " prefix from some HTML conversions (ex: "o Toda pessoa")
    $value = [regex]::Replace($value, '^[oº]\s+', '')
    # Collapse multiple whitespace
    $value = [regex]::Replace($value, '\s{2,}', ' ')
    return $value.Trim()
}

function New-Division([string]$tipo, [string]$rotulo, [int]$linha) {
    return [pscustomobject]@{
        tipo     = $tipo
        rotulo   = $rotulo
        linha    = $linha
        divisoes = [System.Collections.ArrayList]::new()
        artigos  = [System.Collections.ArrayList]::new()
    }
}

function Normalize-NumeroArtigo([string]$numero, [string]$ordinal, [string]$suffix) {
    $n = $numero.Trim()
    if ($ordinal -and $ordinal.Trim()) { $n = "${n}º" }
    if ($suffix -and $suffix.Trim()) { $n = "$n-$suffix" }
    return $n
}

function Get-AudioId([string]$numero) {
    $slug = ($numero -replace 'º', '' -replace '\.', '' -replace '-', '_').ToLowerInvariant()
    $candidate = "estatuto_pessoa_deficiencia-artigo_$slug"
    if ($audioCatalog.ContainsKey($candidate)) { return $candidate }
    return $null
}

function New-Artigo([string]$numero, [string]$rotulo, [int]$linha, [string]$caput) {
    $artigo = [pscustomobject]@{
        numero = $numero
        rotulo = $rotulo
        linha  = $linha
        caput  = Clean-Text $caput
    }

    $audioId = Get-AudioId $numero
    if ($audioId) {
        $artigo | Add-Member -NotePropertyName audioId -NotePropertyValue $audioId
    }

    return $artigo
}

function New-Inciso([string]$numero, [int]$linha, [string]$texto) {
    return [pscustomobject]@{
        numero = $numero
        rotulo = $numero
        linha  = $linha
        texto  = Clean-Text $texto
    }
}

function New-Paragrafo([string]$numero, [string]$rotulo, [int]$linha, [string]$texto) {
    return [pscustomobject]@{
        numero = $numero
        rotulo = $rotulo
        linha  = $linha
        texto  = Clean-Text $texto
    }
}

function New-Alinea([string]$letra, [int]$linha, [string]$texto) {
    return [pscustomobject]@{
        letra  = $letra
        rotulo = "$letra)"
        linha  = $linha
        texto  = Clean-Text $texto
    }
}

$levelMap = @{
    livro    = 0
    parte    = 1
    titulo   = 2
    capitulo = 3
    secao    = 4
    subsecao = 5
}

function Get-Level([string]$tipo) {
    if ($levelMap.ContainsKey($tipo)) { return $levelMap[$tipo] }
    return 99
}

$script:preambulo = @()
$script:divisoes = @()
$script:stack = [System.Collections.Generic.List[object]]::new()
$script:currentArticle = $null
$script:currentContainer = $null
$script:currentPart = $null
$script:currentParagraph = $null
$script:pendingTitleFor = $null
$script:inText = $false
$script:artCount = 0

$reArt = '^\s*Art\.?\s*(\d+(?:\.\d+)*)([ºo°]?)(?:-([A-Z]))?\.?\s*(.*)$'
$reLivro = '^\s*LIVRO\s+[IVXLC]+'
$reParte = '^\s*PARTE\b'
$reTitulo = '^\s*T[íiÍI]TULO\s+[IVXLC]+'
$reCapitulo = '^\s*CAP[íiÍI]TULO\s+[IVXLC]+'
$reSecao = '^\s*Se[çc][ãa]o\s+[IVXLCÚú]+'
$reSubsecao = '^\s*Subse[çc][ãa]o\s+[IVXLCÚú]+'
$reInciso = '^\s*([IVXLCDM]+)\s*[-–]\s*(.*)$'
$reParagrafo = '^\s*(Parágrafo único|§\s*(\d+)\s*[ºo°]?)\.?\s*-?\s*(.*)$'
$reAlinea = '^\s*([a-z])\)\s*(.*)$'

function Add-Division($node) {
    $level = Get-Level $node.tipo
    while ($script:stack.Count -gt 0 -and (Get-Level $script:stack[-1].tipo) -ge $level) {
        [void]$script:stack.RemoveAt($script:stack.Count - 1)
    }

    if ($script:stack.Count -eq 0) {
        $script:divisoes += $node
    } else {
        $parent = $script:stack[$script:stack.Count - 1]
        [void]$parent.divisoes.Add($node)
    }

    [void]$script:stack.Add($node)
    $script:currentContainer = $node
    $script:pendingTitleFor = $node
}

function Add-Article($artigo) {
    if ($null -eq $script:currentContainer) {
        $fallback = New-Division 'texto' 'TEXTO' $artigo.linha
        $script:divisoes += $fallback
        [void]$script:stack.Add($fallback)
        $script:currentContainer = $fallback
    }

    [void]$script:currentContainer.artigos.Add($artigo)
}

function Append-ToTextProperty($target, [string]$property, [string]$text) {
    $clean = Clean-Text $text
    if (-not $clean) { return }

    $current = ''
    if ($target.PSObject.Properties[$property]) {
        $current = [string]$target.$property
    }

    $target.$property = (Clean-Text "$current $clean")
}

function Is-StructuralLine([string]$line) {
    return (
        $line -match $reLivro -or
        $line -match $reParte -or
        $line -match $reTitulo -or
        $line -match $reCapitulo -or
        $line -match $reSecao -or
        $line -match $reSubsecao -or
        $line -match $reArt
    )
}

Write-Host "Iniciando parse..." -ForegroundColor Cyan

for ($i = 0; $i -lt $totalLines; $i++) {
    $trim = $lines[$i].Trim()
    $ln = $i + 1
    if ([string]::IsNullOrWhiteSpace($trim)) { continue }

    if ($trim -like 'Brasília, 6 de julho de 2015*') {
        break
    }

    if ($trim -match $reLivro) {
        $script:inText = $true
    }

    if (-not $script:inText) {
        $script:preambulo += [pscustomobject]@{ texto = Clean-Text $trim; linha = $ln }
        continue
    }

    $division = $null
    if ($trim -match $reLivro) {
        $division = New-Division 'livro' $trim $ln
    } elseif ($trim -match $reParte) {
        $division = New-Division 'parte' $trim $ln
    } elseif ($trim -match $reTitulo) {
        $division = New-Division 'titulo' $trim $ln
    } elseif ($trim -match $reCapitulo) {
        $division = New-Division 'capitulo' $trim $ln
    } elseif ($trim -match $reSecao) {
        $division = New-Division 'secao' $trim $ln
    } elseif ($trim -match $reSubsecao) {
        $division = New-Division 'subsecao' $trim $ln
    }

    if ($division) {
        Add-Division $division
        $script:currentArticle = $null
        $script:currentPart = $null
        $script:currentParagraph = $null
        continue
    }

    if ($script:pendingTitleFor -and -not (Is-StructuralLine $trim)) {
        $script:pendingTitleFor | Add-Member -NotePropertyName titulo -NotePropertyValue (Clean-Text $trim) -Force
        $script:pendingTitleFor | Add-Member -NotePropertyName linhaTitulo -NotePropertyValue $ln -Force
        $script:pendingTitleFor = $null
        continue
    }

    if ($trim -match $reArt) {
        $numero = Normalize-NumeroArtigo $Matches[1] $Matches[2] $Matches[3]
        $rotulo = if ($numero -match 'º$') { "Art. $numero" } else { "Art. $numero." }
        $caputText = $Matches[4]
        if ([string]::IsNullOrWhiteSpace($caputText)) {
            $caputText = ($trim -replace '^\s*Art\.?\s*\d+(?:\.\d+)*[ºo°]?(?:-[A-Z])?\.?\s*', '').Trim()
        }
        $script:currentArticle = New-Artigo $numero $rotulo $ln $caputText
        Add-Article $script:currentArticle
        $script:currentPart = $script:currentArticle
        $script:currentParagraph = $null
        $script:artCount++

        if ($MaxArticles -gt 0 -and $script:artCount -ge $MaxArticles) {
            break
        }
        continue
    }

    if (-not $script:currentArticle) { continue }

    if ($trim -match $reParagrafo) {
        if (-not $script:currentArticle.PSObject.Properties['paragrafos']) {
            $script:currentArticle | Add-Member -NotePropertyName paragrafos -NotePropertyValue ([System.Collections.ArrayList]::new())
        }

        $rawLabel = Clean-Text $Matches[1]
        $numeroParagrafo = if ($rawLabel -match 'Parágrafo único') { 'único' } else { "$($Matches[2])º" }
        $paraText = $Matches[3]
        if ([string]::IsNullOrWhiteSpace($paraText)) {
            $paraText = ($trim -replace '^\s*(Parágrafo único|§\s*\d+[ºo°]?)\.?\s*-?\s*', '').Trim()
        }
        $paragrafo = New-Paragrafo $numeroParagrafo $rawLabel $ln $paraText
        [void]$script:currentArticle.paragrafos.Add($paragrafo)
        $script:currentPart = $paragrafo
        $script:currentParagraph = $paragrafo
        continue
    }

    if ($trim -match $reInciso) {
        if ($script:currentParagraph) {
            if (-not $script:currentParagraph.PSObject.Properties['incisos']) {
                $script:currentParagraph | Add-Member -NotePropertyName incisos -NotePropertyValue ([System.Collections.ArrayList]::new())
            }
            $incisoTarget = $script:currentParagraph
        } else {
            if (-not $script:currentArticle.PSObject.Properties['incisos']) {
                $script:currentArticle | Add-Member -NotePropertyName incisos -NotePropertyValue ([System.Collections.ArrayList]::new())
            }
            $incisoTarget = $script:currentArticle
        }

        $incText = $Matches[2]
        if ([string]::IsNullOrWhiteSpace($incText)) {
            $incText = ($trim -replace '^\s*[IVXLCDM]+\s*[-–]\s*', '').Trim()
        }
        $inciso = New-Inciso $Matches[1] $ln $incText
        [void]$incisoTarget.incisos.Add($inciso)
        $script:currentPart = $inciso
        continue
    }

    if ($trim -match $reAlinea) {
        if ($script:currentPart -and -not $script:currentPart.PSObject.Properties['alineas']) {
            $script:currentPart | Add-Member -NotePropertyName alineas -NotePropertyValue ([System.Collections.ArrayList]::new())
        }

        if ($script:currentPart -and $script:currentPart.PSObject.Properties['alineas']) {
            $alinea = New-Alinea $Matches[1] $ln $Matches[2]
            [void]$script:currentPart.alineas.Add($alinea)
            $script:currentPart = $alinea
        }
        continue
    }

    if ($script:currentPart) {
        if ($script:currentPart.PSObject.Properties['texto']) {
            Append-ToTextProperty $script:currentPart 'texto' $trim
        } elseif ($script:currentPart.PSObject.Properties['caput']) {
            Append-ToTextProperty $script:currentPart 'caput' $trim
        }
    }
}

$root = [ordered]@{
    id             = 'Estatuto_da_Pessoa_com_Deficiencia'
    titulo         = 'Estatuto da Pessoa com Deficiência'
    apelido        = 'Estatuto da Pessoa com Deficiência.'
    sigla          = 'EPD'
    fonte          = 'estatuto_da_pessoa_com_deficiencia.txt'
    fonteHtmlLocal = 'l13146.htm'
    fonteOficial   = 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm'
    preambulo      = $script:preambulo
    divisoes       = $script:divisoes
}

function Get-ArtigoCount($value) {
    if ($null -eq $value) { return 0 }
    if ($value -is [System.Array] -or $value -is [System.Collections.ArrayList]) {
        $sum = 0
        foreach ($item in $value) { $sum += Get-ArtigoCount $item }
        return $sum
    }
    if ($value -is [pscustomobject] -or $value -is [System.Collections.Specialized.OrderedDictionary]) {
        $sum = 0
        foreach ($prop in $value.PSObject.Properties) {
            if ($prop.Name -eq 'artigos' -and ($prop.Value -is [System.Array] -or $prop.Value -is [System.Collections.ArrayList])) {
                $sum += $prop.Value.Count
            }
            $sum += Get-ArtigoCount $prop.Value
        }
        return $sum
    }
    return 0
}

$finalArtCount = Get-ArtigoCount ([pscustomobject]$root)

Write-Host ""
Write-Host "=== ESTATISTICAS ===" -ForegroundColor Cyan
Write-Host "Linhas de artigo processadas: $script:artCount" -ForegroundColor DarkGray
Write-Host "Artigos no JSON gerado: $finalArtCount" -ForegroundColor Green
Write-Host "Audios catalogados: $($audioCatalog.Count)" -ForegroundColor DarkGray

if ($finalArtCount -lt 120 -and $MaxArticles -eq 0) {
    Write-Warning "Contagem de artigos baixa. Verifique o parser ou o TXT."
}

Write-Host ""
Write-Host "Gerando JSON..." -ForegroundColor Cyan
$jsonText = $root | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($outJsonPath, $jsonText, [System.Text.UTF8Encoding]::new($false))

Write-Host "JSON salvo em: $outJsonPath" -ForegroundColor Green
Write-Host "Concluido." -ForegroundColor Green
