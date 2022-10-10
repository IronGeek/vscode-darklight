import {
  window, workspace, commands,
  OutputChannel, ExtensionContext,
  StatusBarAlignment, WorkspaceConfiguration, ConfigurationTarget
} from 'vscode';

const SETTING_KEY_CONFIGURATION = 'darkLight';
const SETTING_KEY_WORKBENCH = 'workbench';
const SETTING_KEY_COLOR_THEME = 'colorTheme';
const SETTING_KEY_LIGHT_THEME = 'preferredLightColorTheme';
const SETTING_KEY_DARK_THEME = 'preferredDarkColorTheme';
const SETTING_KEY_HIGH_CONTRAST_LIGHT_THEME = 'preferredHighContrastLightColorTheme';
const SETTING_KEY_HIGH_CONTRAST_DARK_THEME = 'preferredHighContrastColorTheme';

const COMMAND_TOGGLE_THEME = 'darkLight.toggleColorMode';

interface ILogger {
  log(...msg: any[]): void;
}

class Logger {
  readonly #output: OutputChannel;

  constructor(output: OutputChannel) {
    this.#output = output;
  }

  log(...messages: any[]): void {
    const d = new Date();
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().split(' ')[0];
    const ms = (d.getMilliseconds() + '').padStart(3, '0');

    const msg = messages.map((message: any) => {
      if (typeof message === 'string') {
        return message;
      } else if (typeof message === 'object') {
        return this.encode(message);
      }
      return message.toString();
    }).join('\n');

    this.#output.appendLine(`[${date} ${time}.${ms}] ${msg}`);
  }

  encode(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  dispose(): void {
    this.#output.dispose();
  }
}

class ColorMode {
  #reversing: boolean = false;

  readonly #logger?: ILogger;

  constructor(logger?: ILogger) {
    this.#logger = logger;
  }

  get #configuration(): WorkspaceConfiguration {
    return workspace.getConfiguration(SETTING_KEY_CONFIGURATION);
  }

  get #workbench(): WorkspaceConfiguration {
    return workspace.getConfiguration(SETTING_KEY_WORKBENCH);
  }

  get reversing(): boolean {
    return this.#reversing;
  }

  get current(): string {
    return this.#workbench.get(SETTING_KEY_COLOR_THEME) as string;
  }

  get isHighContrast(): boolean {
    return this.current === this.#workbench.get(SETTING_KEY_HIGH_CONTRAST_LIGHT_THEME) ||
      this.current === this.#workbench.get(SETTING_KEY_HIGH_CONTRAST_DARK_THEME);
  }

  get isDark(): boolean {
    return this.current === this.#workbench.get(SETTING_KEY_DARK_THEME) ||
      this.current === this.#workbench.get(SETTING_KEY_HIGH_CONTRAST_DARK_THEME);
  }

  get light(): string | undefined {
    return this.isHighContrast
      ? this.#workbench.get(SETTING_KEY_HIGH_CONTRAST_LIGHT_THEME)
      : this.#workbench.get(SETTING_KEY_LIGHT_THEME);
  }

  get dark(): string | undefined {
    return this.isHighContrast
      ? this.#workbench.get(SETTING_KEY_HIGH_CONTRAST_DARK_THEME)
      : this.#workbench.get(SETTING_KEY_DARK_THEME);
  }

  get showNotification(): boolean {
    return !!this.#configuration.get<boolean>('showNotification');
  }

  async revert(): Promise<void> {
    if (this.#reversing === true) { return; }

    this.#reversing = true;
    await this.toggle();
    this.#reversing = false;
  }

  async toggle(): Promise<void> {
    const newTheme = this.isDark ? this.light : this.dark;
    this.#logger?.log(`${this.#reversing ? 'reversing' : 'switching'} color theme: ${this.current} ➝ ${newTheme}`);

    try {
      await this.#workbench.update(SETTING_KEY_COLOR_THEME, newTheme, ConfigurationTarget.Global);
    } catch (err) {
      this.#logger?.log(err, this.#workbench);
    }
  }

  async confirm(): Promise<void> {
    if (!this.showNotification) { return; }

    const action = await window.showInformationMessage(
      `Switched color mode to ${this.current}`,
      'Settings', 'Revert', 'Dismiss'
    );

    switch(action) {
      case 'Revert':
        await this.revert();
        break;
      case 'Settings':
        await commands.executeCommand('workbench.action.openSettings', `@ext:irongeek.vscode-darklight`);
        break;
    }
  }
}

export function activate(context: ExtensionContext) {
  const logger = new Logger(window.createOutputChannel('Dark Light'));
  const colorMode = new ColorMode(logger);

  logger.log('activating extension');
  logger.log(`current color theme: ${colorMode.current}`);

  const switchThemeCommand = commands.registerCommand(COMMAND_TOGGLE_THEME, () => colorMode.toggle());
  const configurationChanged = workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration(`${SETTING_KEY_WORKBENCH}.${SETTING_KEY_COLOR_THEME}`)) {
      logger.log(`current color theme: ${colorMode.current}`);

      if (!colorMode.reversing) {
        await colorMode.confirm();
      }
    }
  });

  const themeStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 99);
  themeStatusBarItem.command = COMMAND_TOGGLE_THEME;
  themeStatusBarItem.text = '$(color-mode)';
  themeStatusBarItem.tooltip = 'Toggle VS Code color mode';
  themeStatusBarItem.show();

  context.subscriptions.push(
    logger,
    switchThemeCommand,
    configurationChanged,
    themeStatusBarItem
  );
}

export function deactivate() { }
