
# Hedi Bot

A simple Slack bot that helps identify user and channel IDs.

## Features
- `/get-id` command: Get IDs of users, channels, or usergroups by mentioning them

## Setup
1. Create a Slack App in the [Slack API Console](https://api.slack.com/apps)
2. Import the `manifest.json` from this project
3. Install the app to your workspace
4. Set up the following environment variables in your Replit:
   - `SLACK_BOT_TOKEN`: The OAuth token for your bot
   - `SLACK_SIGNING_SECRET`: The signing secret for your app
   - `SLACK_APP_TOKEN`: The app-level token with Socket Mode enabled

## Running locally
Make sure to create a `.env` file in the root directory with the correct variables set (see the `.env.example` file).
