export const POST_FIELDS = `
  id
  name
  tagline
  description
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

export const MAKER_FIELDS = `
  makers { id name username headline profileImage }
`;

export const GET_POSTS = `
  query GetPosts($first: Int!, $order: PostsOrder, $postedAfter: DateTime, $postedBefore: DateTime, $topic: String, $after: String, $featured: Boolean) {
    posts(first: $first, order: $order, postedAfter: $postedAfter, postedBefore: $postedBefore, topic: $topic, after: $after, featured: $featured) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { ${POST_FIELDS} } }
    }
  }
`;

export const GET_POST_BY_SLUG = `
  query GetPostBySlug($slug: String!) {
    post(slug: $slug) { ${POST_FIELDS} ${MAKER_FIELDS} }
  }
`;

export const GET_POST_BY_ID = `
  query GetPostById($id: ID!) {
    post(id: $id) { ${POST_FIELDS} ${MAKER_FIELDS} }
  }
`;

export const GET_POST_COMMENTS = `
  query GetPostComments($slug: String!, $first: Int!, $after: String) {
    post(slug: $slug) {
      id
      name
      comments(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { id body votesCount createdAt url user { name username } } }
      }
    }
  }
`;

export const GET_TOPICS = `
  query GetTopics($first: Int!, $query: String, $after: String) {
    topics(first: $first, query: $query, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node { id name slug description followersCount postsCount } }
    }
  }
`;

export const GET_USER = `
  query GetUser($username: String!) {
    user(username: $username) {
      id
      name
      username
      headline
      twitterUsername
      websiteUrl
      profileImage
      createdAt
      followers { totalCount }
      following { totalCount }
      madePosts(first: 10) { totalCount edges { node { name tagline slug votesCount featuredAt } } }
    }
  }
`;

export const GET_VIEWER = `
  query GetViewer {
    viewer { user { id name username headline url } }
  }
`;
