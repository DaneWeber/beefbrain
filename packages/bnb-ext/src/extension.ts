import * as vscode from 'vscode'
import { formatBnbYaml } from './core/formatBnbYaml'
import { computeDiagnostics, BnbDiagnostic } from './core/diagnostics'
import { isBnbYamlPath } from './core/isBnbYamlPath'

const SELECTOR: vscode.DocumentSelector = { language: 'yaml' }
const DIAGNOSTIC_COLLECTION_NAME = 'bnb'

function shouldHandle(document: vscode.TextDocument): boolean {
  if (document.languageId !== 'yaml') {
    return false
  }
  const associateAllYaml = vscode.workspace
    .getConfiguration('bnb', document.uri)
    .get<boolean>('associateAllYaml', false)
  return isBnbYamlPath(document.uri.fsPath, associateAllYaml)
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  return new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  )
}

function toVscodeSeverity(
  severity: BnbDiagnostic['severity'],
): vscode.DiagnosticSeverity {
  return severity === 'error'
    ? vscode.DiagnosticSeverity.Error
    : vscode.DiagnosticSeverity.Warning
}

function toVscodeDiagnostic(diagnostic: BnbDiagnostic): vscode.Diagnostic {
  const { range } = diagnostic
  const vscodeRange = new vscode.Range(
    Math.max(range.startLine - 1, 0),
    Math.max(range.startCol - 1, 0),
    Math.max(range.endLine - 1, 0),
    Math.max(range.endCol - 1, 0),
  )
  return new vscode.Diagnostic(
    vscodeRange,
    diagnostic.message,
    toVscodeSeverity(diagnostic.severity),
  )
}

function refreshDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): void {
  if (!shouldHandle(document)) {
    collection.delete(document.uri)
    return
  }
  const diagnostics = computeDiagnostics(document.getText()).map(
    toVscodeDiagnostic,
  )
  collection.set(document.uri, diagnostics)
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    DIAGNOSTIC_COLLECTION_NAME,
  )
  context.subscriptions.push(diagnosticCollection)

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(SELECTOR, {
      provideDocumentFormattingEdits(document) {
        if (!shouldHandle(document)) {
          return []
        }
        const original = document.getText()
        const { formatted, error } = formatBnbYaml(original)
        if (error || formatted === original) {
          return []
        }
        return [vscode.TextEdit.replace(fullDocumentRange(document), formatted)]
      },
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('bnb.formatDocument', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }
      const document = editor.document
      if (!shouldHandle(document)) {
        vscode.window.showWarningMessage(
          'BeefBrain: This file is not recognized as a BeefBrain character YAML file.',
        )
        return
      }
      const { formatted, error } = formatBnbYaml(document.getText())
      if (error) {
        vscode.window.showErrorMessage(`BeefBrain: ${error}`)
        return
      }
      await editor.edit((editBuilder) => {
        editBuilder.replace(fullDocumentRange(document), formatted)
      })
    }),
  )

  const refresh = (document: vscode.TextDocument): void =>
    refreshDiagnostics(document, diagnosticCollection)

  vscode.workspace.textDocuments.forEach(refresh)
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((event) =>
      refresh(event.document),
    ),
    vscode.workspace.onDidCloseTextDocument((document) =>
      diagnosticCollection.delete(document.uri),
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('bnb.associateAllYaml')) {
        vscode.workspace.textDocuments.forEach(refresh)
      }
    }),
  )
}

export function deactivate(): void {}
