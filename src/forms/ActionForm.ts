import { RawMessage, Player, system } from '@minecraft/server';
import { ActionFormData, ActionFormResponse } from '@minecraft/server-ui';

type ButtonOptions = {
    text: string | RawMessage;
    iconPath?: string;
    description?: string;
};

export function Button(options: ButtonOptions | string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target.constructor._buttons) {
            target.constructor._buttons = [];
        }

        const buttonOptions: ButtonOptions = typeof options === 'string' ? { text: options } : options;

        target.constructor._buttons.push({
            ...buttonOptions,
            method: propertyKey
        });
    };
}

export class ActionForm {
    private player: Player;
    private title: string | RawMessage;
    private body: string | RawMessage;
    private form: ActionFormData;

    constructor(player: Player, title: string | RawMessage, body: string | RawMessage) {
        this.player = player;
        this.title = title;
        this.body = body;
        this.form = new ActionFormData();
    }

    async show() {
        this.form.title(this.title);
        this.form.body(this.body);

        const buttons = (this.constructor as any)._buttons || [];
        buttons.forEach((button: ButtonOptions) => {
            let text = button.text + (button.description ? `\n§7${button.description}` : '');
            this.form.button(text, button.iconPath);
        });

        system.run(async() => {
          try {
            console.log('showing form');
            //@ts-expect-error
              const response: ActionFormResponse = await this.form.show(this.player);

              console.log('response', response);

              if (response.selection !== undefined) {
                  const selectedButton = buttons[response.selection];
                  if (selectedButton && (this as any)[selectedButton.method]) {
                      (this as any)[selectedButton.method](this.player);
                  }
              }
          } catch (error) {
              console.error('Error showing form:', error);
          }
        });
    }
}
