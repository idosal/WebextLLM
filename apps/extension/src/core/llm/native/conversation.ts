import { ConvTemplateConfig } from "./config";

/**
 * Helper to keep track of history conversations.
 */
export class Conversation {
  public messages: Array<[string, string | undefined]> = [];
  public config: ConvTemplateConfig;

  // TODO(tvm-team) confirm and remove
  // private contextWindowStart = 0;

  constructor(config: ConvTemplateConfig) {
    this.config = config;
  }

  private getPromptArrayInternal(
    addSystem: boolean,
    startPos: number
  ) {
    if (this.config.seps.length == 0) {
      throw Error("Need seps to work")
    }

    // console.log('system', this.config.system)
    const ret = addSystem ? [this.config.system + this.config.seps[0]] : [];

    // console.log('system ret', ret)

    if (this.config.separator_style == "Two") {
      for (let i = startPos; i < this.messages.length; ++i) {
        const item = this.messages[i];
        const role = item[0];
        const message = item[1];
        if (message !== undefined && message != "") {
          ret.push(role + ": " + message + this.config.seps[i % this.config.seps.length]);
        } else {
          ret.push(role + ":");
        }
      }
      return ret;
    } else if (this.config.separator_style == "RedPajamaChat") {
      for (let i = startPos; i < this.messages.length; ++i) {
        const item = this.messages[i];
        const role = item[0];
        const message = item[1];
        if (message !== undefined && message != "") {
          ret.push(role + ": " + message + this.config.seps[i % this.config.seps.length] + "\n");
        } else {
          ret.push(role + ":");
        }
      }
      // console.log('ret', ret)
      return ret;
    }
    throw Error("Unknown separator style " + this.config.separator_style);
  }

  /**
   * Get prompt arrays with the first one as system.
   *
   * @returns The prompt array.
   */
  getPromptArray(): Array<string> {
    return this.getPromptArrayInternal(true, 0);
  }

  /**
   * Get the last round of prompt has not been fed as input.
   *
   * @note This function needs to be used with the assumption that
   *       the caller call appendMessage then appendReplyHeader.
   *
   * @returns The prompt array.
   */
  getPrompArrayLastRound() {
    if (this.messages.length < 3) {
      throw Error("needs to call getPromptArray for the first message");
    }
    return this.getPromptArrayInternal(false, this.messages.length - 2);
  }

  reset() {
    this.messages = [];
  }

  getStopStr() {
    if (this.config.stop_str != "") {
      return this.config.stop_str;
    } else if (this.config.separator_style == "Two") {
      return this.config.seps[this.config.seps.length - 1];
    }
    throw Error("Unknown separator style " + this.config.separator_style);
  }

  appendMessage(role: string, message: string) {
    if (this.messages.length != 0 &&
      this.messages[this.messages.length - 1][1] == undefined) {
      throw Error("Have unfinished reply");
    }
    this.messages.push([role, message]);
  }

  appendReply(message: string) {
    if (this.messages.length != 0 &&
      this.messages[this.messages.length - 1][1] == undefined) {
      throw Error("Have unfinished reply");
    }
    this.messages.push([this.config.roles[1], message]);
  }

  appendPrompt(message: string) {
    if (this.messages.length != 0 &&
      this.messages[this.messages.length - 1][1] == undefined) {
      throw Error("Have unfinished reply");
    }
    this.messages.push([this.config.roles[0], message]);
  }

  appendReplyHeader(role: string) {
    this.messages.push([role, undefined]);
  }

  setSystem(system: string) {
    this.config.system = system;
  }

  finishReply(message: string) {
    if (this.messages.length == 0) {
      throw Error("Message error should not be 0");
    }
    if (this.messages[this.messages.length - 1][1] !== undefined) {
      throw Error("Already assigned");
    }
    this.messages[this.messages.length - 1][1] = message;
  }
}

export function getConversation(conv_template: string, conv_config?: Partial<ConvTemplateConfig>): Conversation {
  if (conv_template == "llama-2") {
    return new Conversation({
      system: "",
      roles: ["[INST]", "[/INST]"],
      offset: 0,
      seps: [" ", " "],
      separator_style: "Two",
      stop_str: "[INST]",
      add_bos: true,
      ...conv_config,
    });
  } else if (conv_template == "vicuna_v1.1") {
    return new Conversation({
      system: "",
      roles: ["USER", "ASSISTANT"],
      offset: 0,
      seps: [" ", "</s>"],
      separator_style: "Two",
      stop_str: "</s>",
      add_bos: true,
      ...conv_config,
    });
  } else if (conv_template == "wizardlm") {
    return new Conversation({
      system: "",
      roles: ["", "### Response"],
      offset: 0,
      seps: ["\n\n", "</s>"],
      separator_style: "Two",
      stop_str: "\n\n",
      add_bos: true,
      ...conv_config,
    })
  } else if (conv_template == "redpajama_chat") {
    return new Conversation({
      system: "",
      roles: ["<human>", "<bot>"],
      offset: 0,
      seps: ["", ""],
      separator_style: "RedPajamaChat",
      stop_str: "<human>",
      add_bos: false,
      ...conv_config,
    })
  } else if (conv_template == "wizard_coder_or_math") {
    return new Conversation({
      system: "",
      roles: ["Instruction", "Response"],
      offset: 0,
      seps: ["\n\n### ", "\n\n### "],
      separator_style: "Two",
      stop_str: "</s>",
      add_bos: true,
      ...conv_config,
    })
  } else {
    throw Error("Unknown conv template " + conv_template);
  }
}
