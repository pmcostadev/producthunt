/**
 * GraphQL documents for Product Hunt API v2.
 *
 * Field selections are deliberately lean: the API bills by query complexity
 * (6,250 points per 15 minutes), so nothing is requested that a tool does not
 * return. Viewer-context fields (isVoted, isFollowing, isCollected) need the
 * `private` scope and only resolve for OAuth-connected accounts.
 *
 * Verified against the live API, not against the published schema.graphql in
 * producthunt/producthunt-api: that file is stale. It still documents the
 * maker-goals feature (Query.goals, Viewer.goals, Viewer.makerGroups,
 * MakerGroup, GoalsOrder), none of which exist on the live API any more, and
 * it omits fields that do exist, such as Post.reviewsCount.
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

/**
 * Collection fields.
 *
 * `tagline` is deliberately absent. The schema declares it non-nullable, but
 * some real collections have no tagline, and asking for it makes the whole
 * query fail with "Cannot return null for non-nullable field
 * Collection.tagline". Nothing we can do server-side, so we do not ask.
 */
export const COLLECTION_FIELDS = `
  id
  name
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
        edges { node { id name url followersCount user { username } } }
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
        edges { node { id name url followersCount } }
      }
    }
  }
`;

/* --------------------------------- topics --------------------------------- */

/**
 * Note the argument name: `followedByUserid`, with a lowercase d.
 *
 * That is how the live API spells it. `followedByUserId` is rejected with
 * "Field 'topics' doesn't accept argument 'followedByUserId' (Did you mean
 * `followedByUserid`?)". Their typo, and matching it is the only option.
 */
export const GET_TOPICS = `
  query GetTopics($first: Int!, $query: String, $order: TopicsOrder, $followedByUserid: ID, $after: String) {
    topics(first: $first, query: $query, order: $order, followedByUserid: $followedByUserid, after: $after) {
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

/* --------------------------------- viewer --------------------------------- */

export const GET_VIEWER = `
  query GetViewer {
    viewer { user { ${USER_CORE} followers { totalCount } following { totalCount } } }
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
