import { Player, RawMessage } from '@minecraft/server';
import {
  ActionFormData,
  ActionFormResponse,
  ModalFormData,
  ModalFormResponse,
} from '@minecraft/server-ui';

type ButtonCallback = (player: Player) => void;

class EnhancedActionFormData {
  private form = new ActionFormData();
  private buttonCallbacks: Map<number, ButtonCallback> = new Map();

  constructor(title?: string | RawMessage, body?: string | RawMessage) {
    if (title) this.form.title(title);
    if (body) this.form.body(body);
  }

  addButton(text: string | RawMessage, iconPath?: string, callback?: ButtonCallback): this {
    const index = this.buttonCallbacks.size;
    if (callback) this.buttonCallbacks.set(index, callback);
    this.form.button(text, iconPath);
    return this; // For chaining
  }

  async show(player: Player): Promise<string | undefined> {
    try {
      //@ts-expect-error
      const response: ActionFormResponse = await this.form.show(player);
      const selectedCallback = this.buttonCallbacks.get(response.selection ?? -1);

      if (selectedCallback) {
        selectedCallback(player);
      }

      return response.selection !== undefined ? response.selection.toString() : undefined;
    } catch (error) {
      console.error('Error showing form:', JSON.stringify(error));
      return undefined;
    }
  }
}
export { EnhancedActionFormData };

type FormValueType = boolean | number | string;

interface FormField<T extends FormValueType = FormValueType> {
  type: 'toggle' | 'slider' | 'dropdown' | 'textField';
  label: string | RawMessage;
  defaultValue?: T extends string[]
    ? (string | RawMessage)[]
    : T | RawMessage | (string | RawMessage)[];
}

class EnhancedModalFormData {
  private form = new ModalFormData();
  private fields: FormField[] = [];

  constructor(title?: string | RawMessage) {
    if (title) this.form.title(title);
  }

  addToggle(label: string | RawMessage, defaultValue?: boolean): this {
    this.fields.push({ type: 'toggle', label, defaultValue });
    this.form.toggle(label, defaultValue);
    return this;
  }

  addSlider(
    label: string | RawMessage,
    minimumValue: number,
    maximumValue: number,
    valueStep: number,
    defaultValue?: number
  ): this {
    this.fields.push({ type: 'slider', label, defaultValue });
    this.form.slider(label, minimumValue, maximumValue, valueStep, defaultValue);
    return this;
  }

  addDropdown(
    label: string | RawMessage,
    options: (string | RawMessage)[],
    defaultValueIndex?: number
  ): this {
    this.fields.push({ type: 'dropdown', label, defaultValue: options });
    this.form.dropdown(label, options, defaultValueIndex);
    return this;
  }

  addTextField(
    label: string | RawMessage,
    placeholderText: string | RawMessage,
    defaultValue?: string | RawMessage
  ): this {
    this.fields.push({ type: 'textField', label, defaultValue });
    this.form.textField(label, placeholderText, defaultValue);
    return this;
  }

  async show(player: Player): Promise<{ [key: string]: FormValueType } | undefined> {
    try {
      //@ts-expect-error
      const response: ModalFormResponse = await this.form.show(player);
      return this.processFormValues(response.formValues ?? []);
    } catch (error) {
      console.error('Error showing modal form:', error);
      return undefined;
    }
  }

  private processFormValues(formValues: FormValueType[]): { [key: string]: FormValueType } {
    const formData: { [key: string]: FormValueType } = {};
    this.fields.forEach((field, index) => {
      const labelKey = field.label.toString();
      let value = formValues[index];
      if (
        field.type === 'dropdown' &&
        typeof value === 'number' &&
        Array.isArray(field.defaultValue)
      ) {
        value = field.defaultValue[value]?.toString() ?? ''; // Access by index and convert to string
      }
      formData[labelKey] = value;
    });
    return formData;
  }
}

export { EnhancedModalFormData };
