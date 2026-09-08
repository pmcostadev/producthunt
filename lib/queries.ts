/**
 * GraphQL documents for Product Hunt API v2.
 *
 * Field selections are deliberately lean: the API bills by query complexity
 * (6,250 points per 15 minutes), so nothing is requested that a tool does not
 * return. Viewer-context fields (isVoted, isFollowing, isCollected) need the
 * `private` scope and only resolve for OAuth-connected accounts.
 */

export const POST_CORE = `
  id
  name
  tagline
  slug
  url
  website
  votesCount
  commentsCount
  reviewsCount
  reviewsRating
  featuredAt
  createdAt
  thumbnail { url }
  topics(first: 5) { edges { node { name slug } } }
`;

export const POST_FULL = `
  ${POST_CORE}
  description
  isVoted
  isCollected
  media { type url videoUrl }
  makers { id name username headline profileImage }
  user { id name username }
`;

export const USER_CORE = `
  id
  name
  username
  headline
  twitterUsername
  websiteUrl
  profileImage
  url
  isMaker
  isViewer
  isFollowing
  createdAt
`;

export const GOAL_FIELDS = `
  id
  title
  url
  current
  currentUntil
  dueAt
  completedAt
  createdAt
  cheerCount
  isCheered
  focusedDuration
  group { id name url }
  project { id name tagline url }
  user { id name username }
`;

export const COLLECTION_FIELDS = `
  id
  name
  tagline
  description
  url
  followersCount
  isFollowing
  featuredAt
  createdAt
  coverImage
  user { id name username }
`;

/* ---------------------------------- posts --------------------------------- */

export const GET_POSTS = `
  query GetPosts($first: Int!, $order: PostsOrder, $postedAfter: DateTime, $postedBefore: DateTime, $topic: String, $twitterUrl: String, $featured: Boolean, $after: String) {
    posts(first: $first, order: $order, postedAfter: $postedAfter, postedBefore: $postedBefore, topic: $topic, twitterUrl: $twitterUrl, featured: $featured, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { ${POST_CORE} } }
    }
  }
`;

export const GET_POST_BY_SLUG = `
  query GetPostBySlug($slug: String!) {
    post(slug: $slug) { ${POST_FULL} }
  }
`;

export const GET_POST_BY_ID = `
  query GetPostById($id: ID!) {
    post(id: $id) { ${POST_FULL} }
  }
`;

export const GET_POST_COMMENTS = `
  query GetPostComments($slug: String!, $first: Int!, $order: CommentsOrder, $after: String) {
    post(slug: $slug) {
      id
      name
      comments(first: $first, order: $order, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id body votesCount createdAt url parentId user { name username headline } } }
      }
    }
  }
`;

export const GET_COMMENT_THREAD = `
  query GetCommentThread($id: ID!, $first: Int!, $order: CommentsOrder, $after: String) {
    comment(id: $id) {
      id
      body
      votesCount
      createdAt
      url
      isVoted
      user { name username headline }
      replies(first: $first, order: $order, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id body votesCount createdAt url user { name username } } }
      }
    }
  }
`;

export const GET_POST_VOTES = `
  query GetPostVotes($slug: String!, $first: Int!, $after: String, $createdAfter: DateTime, $createdBefore: DateTime) {
    post(slug: $slug) {
      id
      name
      votesCount
      featuredAt
      createdAt
      votes(first: $first, after: $after, createdAfter: $createdAfter, createdBefore: $createdBefore) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id createdAt user { username } } }
      }
    }
  }
`;

export const GET_POST_COLLECTIONS = `
  query GetPostCollections($slug: String!, $first: Int!, $after: String) {
    post(slug: $slug) {
      id
      name
      collections(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id name tagline url followersCount user { username } } }
      }
    }
  }
`;

/* ---------------------------------- people -------------------------------- */

export const GET_USER = `
  query GetUser($username: String, $id: ID) {
    user(username: $username, id: $id) {
      ${USER_CORE}
      followers { totalCount }
      following { totalCount }
      madePosts(first: 10) { totalCount edges { node { name tagline slug votesCount featuredAt } } }
      submittedPosts(first: 5) { totalCount edges { node { name slug votesCount } } }
    }
  }
`;

export const GET_USER_POSTS = `
  query GetUserPosts($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      username
      madePosts(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { ${POST_CORE} } }
      }
    }
  }
`;

export const GET_USER_SUBMITTED = `
  query GetUserSubmitted($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      username
      submittedPosts(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { ${POST_CORE} } }
      }
    }
  }
`;

export const GET_USER_VOTED = `
  query GetUserVoted($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      username
      votedPosts(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { ${POST_CORE} } }
      }
    }
  }
`;

export const GET_USER_FOLLOWERS = `
  query GetUserFollowers($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      username
      followers(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id name username headline isFollowing } }
      }
    }
  }
`;

export const GET_USER_FOLLOWING = `
  query GetUserFollowing($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      username
      following(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id name username headline isFollowing } }
      }
    }
  }
`;

export const GET_USER_COLLECTIONS = `
  query GetUserFollowedCollections($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      username
      followedCollections(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id name tagline url followersCount } }
      }
    }
  }
`;

/* --------------------------------- topics --------------------------------- */

export const GET_TOPICS = `
  query GetTopics($first: Int!, $query: String, $order: TopicsOrder, $followedByUserId: ID, $after: String) {
    topics(first: $first, query: $query, order: $order, followedByUserId: $followedByUserId, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { id name slug description followersCount postsCount isFollowing url } }
    }
  }
`;

export const GET_TOPIC = `
  query GetTopic($slug: String, $id: ID) {
    topic(slug: $slug, id: $id) {
      id name slug description followersCount postsCount isFollowing url image createdAt
    }
  }
`;

/* ------------------------------- collections ------------------------------- */

export const GET_COLLECTIONS = `
  query GetCollections($first: Int!, $order: CollectionsOrder, $featured: Boolean, $postId: ID, $userId: ID, $after: String) {
    collections(first: $first, order: $order, featured: $featured, postId: $postId, userId: $userId, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { ${COLLECTION_FIELDS} } }
    }
  }
`;

export const GET_COLLECTION = `
  query GetCollection($slug: String, $id: ID, $first: Int!) {
    collection(slug: $slug, id: $id) {
      ${COLLECTION_FIELDS}
      topics(first: 5) { edges { node { name slug } } }
      posts(first: $first) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { ${POST_CORE} } }
      }
    }
  }
`;

/* ---------------------------- goals & maker spaces ------------------------- */

export const GET_GOALS = `
  query GetGoals($first: Int!, $order: GoalsOrder, $completed: Boolean, $userId: ID, $makerGroupId: ID, $makerProjectId: ID, $after: String) {
    goals(first: $first, order: $order, completed: $completed, userId: $userId, makerGroupId: $makerGroupId, makerProjectId: $makerProjectId, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { ${GOAL_FIELDS} } }
    }
  }
`;

export const GET_GOAL = `
  query GetGoal($id: ID!) {
    goal(id: $id) { ${GOAL_FIELDS} }
  }
`;

export const GET_MAKER_GROUPS = `
  query GetMakerGroups($first: Int!, $order: MakerGroupsOrder, $userId: ID, $after: String) {
    makerGroups(first: $first, order: $order, userId: $userId, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { id name tagline description url membersCount goalsCount isMember } }
    }
  }
`;

export const GET_MAKER_GROUP = `
  query GetMakerGroup($id: ID!) {
    makerGroup(id: $id) { id name tagline description url membersCount goalsCount isMember }
  }
`;

/* --------------------------------- viewer --------------------------------- */

export const GET_VIEWER = `
  query GetViewer {
    viewer { user { ${USER_CORE} followers { totalCount } following { totalCount } } }
  }
`;

export const GET_MY_GOALS = `
  query GetMyGoals($first: Int!, $order: GoalsOrder, $current: Boolean, $after: String) {
    viewer {
      user { username }
      goals(first: $first, order: $order, current: $current, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { ${GOAL_FIELDS} } }
      }
    }
  }
`;

export const GET_MY_SPACES = `
  query GetMySpaces($first: Int!) {
    viewer {
      user { username }
      makerGroups(first: $first) {
        totalCount
        edges { node { id name tagline url membersCount goalsCount } }
      }
      makerProjects(first: $first) {
        totalCount
        edges { node { id name tagline url image lookingForOtherMakers } }
      }
    }
  }
`;

/* -------------------------------- engagement ------------------------------ */

export const CHECK_POST_ENGAGEMENT = `
  query CheckPostEngagement($slug: String!) {
    post(slug: $slug) {
      id name slug votesCount commentsCount isVoted isCollected
      topics(first: 5) { edges { node { name slug isFollowing } } }
    }
  }
`;

export const CHECK_USER_FOLLOW = `
  query CheckUserFollow($username: String!) {
    user(username: $username) { id name username isFollowing isViewer }
  }
`;
