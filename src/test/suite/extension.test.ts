import * as assert from 'assert';
import { before, after } from 'mocha';

import * as vscode from 'vscode';
// import * as extension from '../../extension';

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

suite('Extension Test Suite', () => {
  before(async () => {
    // wait .1s for startup to finish...
    await sleep(100); // TODO: find a better way?
  });

	after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  test("should be installed", () => {
    assert.ok(vscode.extensions.getExtension("IronGeek.vscode-darklight"));
  });

  test("should be active", async () => {
    const ext = vscode.extensions.getExtension("IronGeek.vscode-darklight");
    assert.strictEqual(ext?.isActive, true);
  });

  test("should register command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.notEqual(commands.indexOf("darkLight.toggleColorMode"), -1);
  });
});
