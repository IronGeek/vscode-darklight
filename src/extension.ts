import {
  window, workspace, commands,
  OutputChannel, ExtensionContext,
  StatusBarItem, StatusBarAlignment,
  WorkspaceConfiguration, ConfigurationTarget
} from 'vscode';

const SETTING_KEY_CONFIGURATION = 'darkLight';
const SETTING_KEY_WORKBENCH = 'workbench';
const SETTING_KEY_COLOR_THEME = 'colorTheme';
const SETTING_KEY_LIGHT_THEME = 'preferredLightColorTheme';
const SETTING_KEY_DARK_THEME = 'preferredDarkColorTheme';

const COMMAND_TOGGLE_THEME = 'darkLight.toggleColorMode';

let themeStatusBarItem: StatusBarItem;

interface ILogger {
  log(...msg: any[]): void;
}

class Logger {
  constructor(readonly output: OutputChannel) {
    this.output = output;
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

    this.output.appendLine(`[${date} ${time}.${ms}] ${msg}`);
  }

  encode(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  dispose(): void {
    this.output.dispose();
  }
}

class ColorMode {
  constructor(private logger?: ILogger) {
  }

  private get configuration(): WorkspaceConfiguration {
    return workspace.getConfiguration(SETTING_KEY_CONFIGURATION);
  }

  private get workbench(): WorkspaceConfiguration {
    return workspace.getConfiguration(SETTING_KEY_WORKBENCH);
  }

  get current(): WorkspaceConfiguration | undefined {
    return this.workbench
      .get(SETTING_KEY_COLOR_THEME);
  }

  get mode(): 'dark' | 'light' {
    return this.current === this.light ? 'light' : 'dark';
  }

  get light(): WorkspaceConfiguration | undefined {
    return this.workbench
      .get(SETTING_KEY_LIGHT_THEME);
  }

  get dark(): WorkspaceConfiguration | undefined {
    return this.workbench
      .get(SETTING_KEY_DARK_THEME);
  }

  get showNotification(): boolean {
    return !!this.configuration
      .get<boolean>('showNotification');
  }

  async toggle(): Promise<ColorMode> {
    try {
      const newTheme = (this.current === this.light) ? this.dark : this.light;
      this.logger?.log(`switching color mode: (${this.current}) ➝ (${newTheme})`);

      await this.workbench
        .update(SETTING_KEY_COLOR_THEME, newTheme, ConfigurationTarget.Global);
    } catch (err) {
      this.logger?.log(err, this.workbench);
    }

    return this;
  }
}

export function activate(context: ExtensionContext) {
  const logger = new Logger(window.createOutputChannel('Dark Light'));
  logger.log('activating extension');

  const toggleColorMode = async (confirm?: boolean): Promise<void> => {
    const colorMode = await new ColorMode(logger).toggle();
    if (confirm || !colorMode.showNotification) {
      return;
    }

    const action = await window.showInformationMessage(
      `Switched to ${colorMode.mode} mode (${colorMode.current})`,
      'Settings', 'Revert', 'Dismiss'
    );

    switch(action) {
      case 'Revert':
        await toggleColorMode(true);
        break;
      case 'Settings':
        await commands.executeCommand('workbench.action.openSettings', `@ext:irongeek.vscode-darklight`);
        break;
    }
  };

  const switchThemeCommand = commands.registerCommand(COMMAND_TOGGLE_THEME, toggleColorMode);

  themeStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 99);
  themeStatusBarItem.command = COMMAND_TOGGLE_THEME;
  themeStatusBarItem.text = '$(color-mode)';
  themeStatusBarItem.tooltip = 'Toggle VS Code color mode';
  themeStatusBarItem.show();

  context.subscriptions.push(
    logger,
    switchThemeCommand,
    themeStatusBarItem
  );
}

export function deactivate() { }
