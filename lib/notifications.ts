import prisma from "@/lib/prisma";

type NotificationType = "match" | "like" | "comment" | "collaboration" | "system";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
  fromUserId?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  content,
  link,
  fromUserId,
}: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        link,
        fromUserId,
      },
    });
  } catch (error) {
    console.error("创建通知失败:", error);
    return null;
  }
}

export async function createMatchNotification(
  userId: string,
  matchedUserName: string,
  matchedUserId: string
) {
  return createNotification({
    userId,
    type: "match",
    title: "连接成功！",
    content: `你和 ${matchedUserName} 已建立连接，快去打个招呼吧！`,
    link: "/messages",
    fromUserId: matchedUserId,
  });
}

// 有人向你发起连接（合作发现）
export async function createUserLikeNotification(
  userId: string,
  likerName: string,
  likerId: string
) {
  return createNotification({
    userId,
    type: "like",
    title: "收到连接邀请",
    content: `${likerName} 想与你建立连接，去看看是否要接受？`,
    link: "/matching",
    fromUserId: likerId,
  });
}

export async function createLikeNotification(
  userId: string,
  likerName: string,
  likerId: string,
  ideaTitle: string
) {
  return createNotification({
    userId,
    type: "like",
    title: "有人喜欢了你的创意",
    content: `${likerName} 喜欢了你的创意「${ideaTitle}」`,
    link: "/nebula",
    fromUserId: likerId,
  });
}

export async function createCommentNotification(
  userId: string,
  commenterName: string,
  commenterId: string,
  ideaTitle: string,
  ideaId: string
) {
  return createNotification({
    userId,
    type: "comment",
    title: "新评论",
    content: `${commenterName} 评论了你的创意「${ideaTitle}」`,
    link: `/nebula?idea=${ideaId}`,
    fromUserId: commenterId,
  });
}

export async function createCollaborationNotification(
  userId: string,
  requesterName: string,
  requesterId: string,
  ideaTitle: string
) {
  return createNotification({
    userId,
    type: "collaboration",
    title: "协作申请",
    content: `${requesterName} 申请加入你的创意「${ideaTitle}」`,
    link: "/profile?tab=ideas",
    fromUserId: requesterId,
  });
}

export async function createSystemNotification(
  userId: string,
  title: string,
  content?: string,
  link?: string
) {
  return createNotification({
    userId,
    type: "system",
    title,
    content,
    link,
  });
}
