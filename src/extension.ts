import {
  commands, ConfigurationTarget, ExtensionContext, LogOutputChannel, StatusBarAlignment,
  ThemeColor,
  window, workspace, WorkspaceConfiguration
} from 'vscode';

const SETTING_KEY_CONFIGURATION = 'darkLight';
const SETTING_KEY_WORKBENCH = 'workbench';
const SETTING_KEY_COLOR_THEME = 'colorTheme';
const SETTING_KEY_LIGHT_THEME = 'preferredLightColorTheme';
const SETTING_KEY_DARK_THEME = 'preferredDarkColorTheme';
const SETTING_KEY_HIGH_CONTRAST_LIGHT_THEME = 'preferredHighContrastLightColorTheme';
const SETTING_KEY_HIGH_CONTRAST_DARK_THEME = 'preferredHighContrastColorTheme';

const COMMAND_TOGGLE_THEME = 'darkLight.toggleColorMode';

class ColorMode {
  #reverting: boolean = false;
  #confirming: boolean = false;

  readonly #logger: LogOutputChannel;

  constructor(logger: LogOutputChannel) {
    this.#logger = logger;
  }

  get #configuration(): WorkspaceConfiguration {
    return workspace.getConfiguration(SETTING_KEY_CONFIGURATION);
  }

  get #workbench(): WorkspaceConfiguration {
    return workspace.getConfiguration(SETTING_KEY_WORKBENCH);
  }

  get reverting(): boolean {
    return this.#reverting;
  }

  get confirming(): boolean {
    return this.#confirming;
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
    if (this.#reverting === true) { return; }

    this.#reverting = true;
    await this.toggle();
    this.#reverting = false;
  }

  async toggle(): Promise<void> {
    if (this.#confirming === true) { return; }

    const next = this.isDark ? this.light : this.dark;
    this.#logger.info(`${this.#reverting ? 'reverting' : 'switching'} color theme: '${this.current}' ➝ '${next}'`);

    try {
      await this.#workbench.update(SETTING_KEY_COLOR_THEME, next, ConfigurationTarget.Global);
    } catch (err: any) {
      this.#logger.error(err);
    }
  }

  async confirm(): Promise<void> {
    if (!this.showNotification) { return; }

    this.#confirming = true;
    const action = await window.showInformationMessage(
      `Switched color mode to ${this.current}`,
      'Settings', 'Revert', 'Dismiss'
    );
    this.#confirming = false;

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
  const logger = window.createOutputChannel('Dark Light', { log: true });

  const { publisher, name, version } = context.extension.packageJSON;
  logger.info(`activating ${publisher}.${name} version ${version}`);

  const colorMode = new ColorMode(logger);
  logger.info(`current color theme: '${(colorMode.current)}'`);

  const themeStatusBarTooltip = `Toggle VS Code color mode`;
  const themeStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 99);
  themeStatusBarItem.command = COMMAND_TOGGLE_THEME;
  themeStatusBarItem.text = '$(color-mode)';
  themeStatusBarItem.tooltip = themeStatusBarTooltip;
  themeStatusBarItem.show();

  const switchThemeCommand = commands.registerCommand(COMMAND_TOGGLE_THEME, () => colorMode.toggle());
  const configurationChanged = workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration(`${SETTING_KEY_WORKBENCH}.${SETTING_KEY_COLOR_THEME}`)) {
      logger.info(`current color theme: '${(colorMode.current)}'`);
      if (!colorMode.reverting) {
        themeStatusBarItem.text = '$(debug-pause)';
        themeStatusBarItem.tooltip = `${themeStatusBarTooltip} (paused)`;
        await colorMode.confirm();
        themeStatusBarItem.text = '$(color-mode)';
        themeStatusBarItem.tooltip = themeStatusBarTooltip;
      }
    }
  });

  context.subscriptions.push(
    logger,
    switchThemeCommand,
    configurationChanged,
    themeStatusBarItem
  );
}

export function deactivate() { }
