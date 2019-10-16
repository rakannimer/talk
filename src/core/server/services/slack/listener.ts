import { CommentEnteredModerationQueuePayload } from "coral-server/graph/tenant/resolvers/CommentEnteredModerationQueuePayload";
import { CommentCreatedInput } from "coral-server/graph/tenant/resolvers/Subscription/commentCreated";
import { CommentEnteredModerationQueueInput } from "coral-server/graph/tenant/resolvers/Subscription/commentEnteredModerationQueue";
import { CommentFeaturedInput } from "coral-server/graph/tenant/resolvers/Subscription/commentFeatured";
import { CommentLeftModerationQueueInput } from "coral-server/graph/tenant/resolvers/Subscription/commentLeftModerationQueue";
import { CommentReleasedInput } from "coral-server/graph/tenant/resolvers/Subscription/commentReleased";
import { CommentReplyCreatedInput } from "coral-server/graph/tenant/resolvers/Subscription/commentReplyCreated";
import { CommentStatusUpdatedInput } from "coral-server/graph/tenant/resolvers/Subscription/commentStatusUpdated";
import { SUBSCRIPTION_CHANNELS } from "coral-server/graph/tenant/resolvers/Subscription/types";
import logger from "coral-server/logger";

import { GQLMODERATION_QUEUE } from "coral-server/graph/tenant/schema/__generated__/types";

import SlackContext from "./context";

type Payload =
  | CommentEnteredModerationQueueInput
  | CommentLeftModerationQueueInput
  | CommentStatusUpdatedInput
  | CommentReplyCreatedInput
  | CommentCreatedInput
  | CommentFeaturedInput
  | CommentReleasedInput;

function enteredModeration(channel: SUBSCRIPTION_CHANNELS) {
  return channel === SUBSCRIPTION_CHANNELS.COMMENT_ENTERED_MODERATION_QUEUE;
}

function isFeatured(channel: SUBSCRIPTION_CHANNELS) {
  return channel === SUBSCRIPTION_CHANNELS.COMMENT_FEATURED;
}

function isReported(channel: SUBSCRIPTION_CHANNELS, payload: Payload) {
  const p: any = payload;
  return (
    channel === SUBSCRIPTION_CHANNELS.COMMENT_ENTERED_MODERATION_QUEUE &&
    typeof payload === CommentEnteredModerationQueuePayload &&
    p.queue === GQLMODERATION_QUEUE.REPORTED
  );
}

function isPending(channel: SUBSCRIPTION_CHANNELS, payload: Payload) {
  const p: any = payload;
  return (
    channel === SUBSCRIPTION_CHANNELS.COMMENT_ENTERED_MODERATION_QUEUE &&
    typeof payload === CommentEnteredModerationQueuePayload &&
    p.queue === GQLMODERATION_QUEUE.PENDING
  );
}

async function postCommentToSlack(
  ctx: SlackContext,
  commentID: string,
  webhookURL: string
) {
  const comment = await ctx.comments.load(commentID);
  if (comment === null) {
    return;
  }
  const story = await ctx.stories.load(comment.storyID);
  if (story === null) {
    return;
  }
  const author = await ctx.users.load(comment.authorID);
  if (author === null) {
    return;
  }

  const storyTitle = story.metadata ? story.metadata.title : "";
  const commentBody =
    comment.revisions.length > 0
      ? comment.revisions[comment.revisions.length - 1].body
      : "";
  const body = commentBody.replace(new RegExp("<br>", "g"), "\n");

  const data = {
    text: `${author} commented on: ${storyTitle}`,
    blocks: [
      {
        type: "section",
        block_id: "section000",
        fields: [
          {
            type: "mrkdwn",
            text: `${author.username} commented on: <${
              story.url
            }|${storyTitle}> \n ${body}`,
          },
        ],
      },
    ],
  };

  await fetch(webhookURL, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrer: "no-referrer",
    body: JSON.stringify(data),
  });
}

async function listener(
  ctx: SlackContext,
  channel: SUBSCRIPTION_CHANNELS,
  payload: Payload
) {
  const { tenantID } = ctx;

  try {
    const tenant = await ctx.tenants.load(tenantID);
    if (!tenant) {
      throw new Error("Unable to find tenant");
    }

    const { slack } = tenant;
    if (!slack) {
      return;
    }

    const { channels } = slack;
    if (!channels || channels.length <= 0) {
      return;
    }

    channels.forEach(ch => {
      if (!ch) {
        return;
      }
      if (!ch.enabled) {
        return;
      }
      const { hookURL } = ch;
      if (!hookURL) {
        return;
      }
      const { triggers } = ch;
      if (!triggers) {
        return;
      }

      const inModeration = enteredModeration(channel);
      const reported = isReported(channel, payload);
      const pending = isPending(channel, payload);
      const featured = isFeatured(channel);

      const { commentID } = payload;

      if (
        triggers.allComments &&
        (reported || pending || featured || inModeration)
      ) {
        postCommentToSlack(ctx, commentID, hookURL);
      } else if (triggers.reportedComments && reported) {
        postCommentToSlack(ctx, commentID, hookURL);
      } else if (triggers.pendingComments && pending) {
        postCommentToSlack(ctx, commentID, hookURL);
      } else if (triggers.featuredComments && featured) {
        postCommentToSlack(ctx, commentID, hookURL);
      }
    });
  } catch (err) {
    logger.warn(
      { e: err, channel, payload, tenantID },
      "could not handle comment in Slack listener"
    );
  }
}

export default listener;
