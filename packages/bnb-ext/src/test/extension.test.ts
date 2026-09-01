import * as assert from 'assert'
import * as path from 'path'
import * as vscode from 'vscode'

suite('bnb-ext extension', () => {
  test('associates .bnb.yaml files with the BeefBrain YAML language', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../src/test/fixtures/sample.bnb.yaml',
    )
    const document = await vscode.workspace.openTextDocument(fixturePath)

    assert.strictEqual(document.languageId, 'bnb-yaml')
  })

  test('activates and registers the format command', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../src/test/fixtures/sample.bnb.yaml',
    )
    const document = await vscode.workspace.openTextDocument(fixturePath)
    await vscode.window.showTextDocument(document)

    const extension = vscode.extensions.getExtension('daneweber.bnb-ext')
    assert.ok(extension, 'extension should be discoverable by id')
    await extension?.activate()
    assert.strictEqual(extension?.isActive, true)

    const commands = await vscode.commands.getCommands(true)
    assert.ok(
      commands.includes('bnb.formatDocument'),
      'bnb.formatDocument command should be registered',
    )
  })

  test('registers as the document formatter for .bnb.yaml files', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../src/test/fixtures/sample.bnb.yaml',
    )
    const document = await vscode.workspace.openTextDocument(fixturePath)

    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      'vscode.executeFormatDocumentProvider',
      document.uri,
      { insertSpaces: true, tabSize: 2 },
    )

    assert.ok(edits, 'a formatter should be registered for .bnb.yaml files')
    assert.strictEqual(
      vscode.workspace
        .getConfiguration('editor', document.uri)
        .get<string>('defaultFormatter'),
      'daneweber.bnb-ext',
    )
  })

  test('formats and calculates a .bnb.yaml document via the format command', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../src/test/fixtures/sample.bnb.yaml',
    )
    const document = await vscode.workspace.openTextDocument(fixturePath)
    const editor = await vscode.window.showTextDocument(document)

    const before = document.getText()
    await vscode.commands.executeCommand('bnb.formatDocument')

    // The fixture is already in bnb-core's compact format, so formatting
    // should be a stable no-op rather than throwing or corrupting the file.
    assert.strictEqual(document.getText(), before)

    // Revert any editor-marked dirty state from the (no-op) edit attempt.
    if (document.isDirty) {
      await vscode.commands.executeCommand('workbench.action.files.revert')
    }
    void editor
  })
})
