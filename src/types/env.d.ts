declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Slack bot token */
      SLACK_BOT_TOKEN: string;
      /** Slack signing secret */
      SLACK_SIGNING_SECRET: string;
      /** Slack app token */
      SLACK_APP_TOKEN: string;
    }
  }
}

export {};