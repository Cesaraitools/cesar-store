export type MetaFeedChange = {
  field?: string;
  value?: {
    item?: string;
    verb?: string;
    comment_id?: string;
    post_id?: string;
    parent_id?: string;
    photo_id?: string;
    video_id?: string;
    object_id?: string;
    sender_id?: string;
    from?: { id?: string; name?: string };
    message?: string;
    created_time?: number;
    permalink_url?: string;
    [key: string]: unknown;
  };
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function summarizeMetaFeedChange(change: MetaFeedChange) {
  const value = change.value || {};
  const message = stringValue(value.message);
  const commentId = stringValue(value.comment_id);
  const postId = stringValue(value.post_id);
  const parentId = stringValue(value.parent_id);

  return {
    field: stringValue(change.field),
    item: stringValue(value.item),
    verb: stringValue(value.verb),
    commentId,
    postId,
    parentId,
    photoId: stringValue(value.photo_id),
    videoId: stringValue(value.video_id),
    objectId: stringValue(value.object_id),
    hasMessage: Boolean(message.trim()),
    messageLength: message.length,
    hasActor: Boolean(value.from || value.sender_id),
    valueKeys: Object.keys(value).sort().slice(0, 40),
    structurallyCommentLike: Boolean(
      commentId && (postId || parentId) && message.trim()
    ),
  };
}
