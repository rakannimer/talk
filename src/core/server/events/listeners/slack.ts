import { reconstructTenantURL } from "coral-server/app/url";
import TenantContext from "coral-server/graph/tenant/context";
import logger from "coral-server/logger";
import { getLatestRevision } from "coral-server/models/comment";
import { getStoryTitle, getURLWithCommentID } from "coral-server/models/story";
import { createFetch } from "coral-server/services/fetch";

import {
  GQLMODERATION_QUEUE,
  GQLSlackChannelTriggers,
} from "coral-server/graph/tenant/schema/__generated__/types";

import {
  CommentEnteredModerationQueueCoralEventPayload,
  CommentFeaturedCoralEventPayload,
  CoralEventType,
} from "../events";
import { CoralEventListener, CoralEventPublisherFactory } from "../publisher";

type SlackCoralEventListenerPayloads =
  | CommentFeaturedCoralEventPayload
  | CommentEnteredModerationQueueCoralEventPayload;

export class SlackCoralEventListener
  implements CoralEventListener<SlackCoralEventListenerPayloads> {
  public readonly name = "slack";
  public readonly events = [
    CoralEventType.COMMENT_FEATURED,
    CoralEventType.COMMENT_ENTERED_MODERATION_QUEUE,
  ];
  private readonly fetch = createFetch({ name: "slack" });

  private payloadTriggers(payload: SlackCoralEventListenerPayloads) {
    const triggers: GQLSlackChannelTriggers = {
      allComments: true,
      reportedComments: false,
      pendingComments: false,
      featuredComments: false,
    };

    switch (payload.type) {
      case CoralEventType.COMMENT_ENTERED_MODERATION_QUEUE:
        if (payload.data.queue === GQLMODERATION_QUEUE.REPORTED) {
          triggers.reportedComments = true;
        } else if (payload.data.queue === GQLMODERATION_QUEUE.PENDING) {
          triggers.pendingComments = true;
        }
        break;
      case CoralEventType.COMMENT_FEATURED:
        triggers.featuredComments = true;
        break;
    }

    return triggers;
  }

  /**
   * postMessage will prepare and send the incoming Slack webhook.
   *
   * @param ctx context of the request
   * @param payload payload for the event that occurred
   * @param hookURL url to the Slack webhook that we should send the message to
   */
  private async postMessage(
    { loaders, config, tenant, req }: TenantContext,
    payload: SlackCoralEventListenerPayloads,
    hookURL: string
  ) {
    // Get the comment.
    const comment = await loaders.Comments.comment.load(payload.data.commentID);
    if (!comment) {
      return;
    }

    // Get the story.
    const story = await loaders.Stories.story.load(payload.data.storyID);
    if (!story) {
      return;
    }

    // Get the author.
    const author = await loaders.Users.user.load(comment.authorID);
    if (!author) {
      return;
    }

    // Get some properties about the event.
    const storyTitle = getStoryTitle(story);
    const commentBody = getLatestRevision(comment).body;
    const moderateLink = reconstructTenantURL(
      config,
      tenant,
      req,
      `/admin/moderate/comment/${comment.id}`
    );
    const commentLink = getURLWithCommentID(story.url, comment.id);

    // Replace HTML link breaks with newlines.
    const body = commentBody.replace(/<br\/?>/g, "\n");

    // Send the post to the Slack URL. We don't wrap this in a try/catch because
    // it's handled in the calling function.
    const res = await this.fetch(hookURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `${author.username} commented on: ${storyTitle}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${author.username} commented on:\n<${story.url}|${storyTitle}>`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `<${moderateLink}|Go to Moderation> | <${commentLink}|See Comment>`,
            },
          },
          { type: "divider" },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: body,
            },
          },
        ],
      }),
    });

    // Check that the request was completed successfully.
    if (!res.ok) {
      throw new Error(`slack returned non-200 status code: ${res.status}`);
    }
  }

  public initialize: CoralEventPublisherFactory<
    SlackCoralEventListenerPayloads
  > = ctx => async payload => {
    const {
      tenant: { id: tenantID, slack },
    } = ctx;

    if (
      // If slack is not defined,
      !slack ||
      // Or there are no slack channels,
      slack.channels.length === 0 ||
      // Or each channel isn't enabled or configured right.
      slack.channels.every(c => !c.enabled || !c.hookURL)
    ) {
      // Exit out then.
      return;
    }

    // Get the triggers that are associated with this payload.
    const triggers = this.payloadTriggers(payload);

    // For each channel that is enabled with configuration.
    for (const channel of slack.channels) {
      if (!channel.enabled || !channel.hookURL) {
        continue;
      }

      if (
        // If all comments are enabled,
        channel.triggers.allComments ||
        // Or featured comments are, and it's a featured comment,
        (channel.triggers.featuredComments && triggers.featuredComments) ||
        // Or reported comments are, and it's a reported comment,
        (channel.triggers.reportedComments && triggers.reportedComments) ||
        // Or pending comments are, and it's a pending comment,
        (channel.triggers.pendingComments && triggers.pendingComments)
      ) {
        try {
          // Post the message to slack.
          await this.postMessage(ctx, payload, channel.hookURL);
        } catch (err) {
          logger.error(
            { err, tenantID, payload, channel },
            "could not post the comment to slack"
          );
        }
      }
    }
  };
}
