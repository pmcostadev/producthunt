import Endpoint from './endpoint';

/**
 * Landing page.
 *
 * The tool table is the substance of this page: it is what a reader is deciding
 * about, and the tool names are the terms anyone looking for this would search
 * for. The old version listed seven tools and linked to a repository that no
 * longer exists, so both are corrected here.
 */

const REPO = 'https://github.com/pmcostadev/producthunt';

const TOOLS: { group: string; items: [string, string][] }[] = [
  {
    group: 'Launches',
    items: [
      [
        'ph_get_posts',
        'List launches. Filter by date range, topic, featured status or Twitter URL.'
      ],
      ['ph_get_post', 'Full detail for one launch: description, makers, media, topics.'],
      [
        'ph_get_post_comments',
        'Read the comments. Order by votes to surface feedback people agreed with.'
      ],
      ['ph_get_comment_thread', 'Expand one comment into its full reply thread.'],
      [
        'ph_vote_velocity',
        'Sample vote timestamps and bucket them by hour, to see how fast a launch climbed.'
      ],
      ['ph_get_post_collections', 'Which curated collections feature a launch.'],
      [
        'ph_check_engagement',
        'Whether the connected account voted for, collected, or follows the topics of a launch.'
      ]
    ]
  },
  {
    group: 'Topics and collections',
    items: [
      ['ph_search_topics', 'Search topics. Returns the slugs used for filtering.'],
      ['ph_get_topic', 'Detail and follower count for one topic.'],
      ['ph_search_collections', 'Find collections, ordered by followers or recency.'],
      ['ph_get_collection', 'One collection with the launches inside it.']
    ]
  },
  {
    group: 'People',
    items: [
      ['ph_get_user', 'Profile, follower counts and headline for a maker.'],
      ['ph_get_user_posts', 'Launches a user made or voted for.'],
      ['ph_get_user_network', "A user's followers, or the accounts they follow."],
      ['ph_get_user_followed_collections', 'Collections a user follows.'],
      ['ph_check_user_follow', 'Whether the connected account follows a user.']
    ]
  },
  {
    group: 'Account and escape hatch',
    items: [
      ['ph_whoami', 'Verify the credential and see whose account it is.'],
      ['ph_graphql', 'Arbitrary read queries. Mutations are rejected before they are sent.']
    ]
  }
];

const TOOL_COUNT = TOOLS.reduce((n, g) => n + g.items.length, 0);

export default function Home() {
  return (
    <>
      <div className="shell">
        <section className="hero">
          <span className="label">Model Context Protocol server</span>
          <h1 className="display-xl">
            Product Hunt,
            <br />
            read by
            <br />
            agents
          </h1>
          <p className="lede">
            {TOOL_COUNT} read-only tools over the Product Hunt API. Ask what launched today, how
            fast something climbed, what the comments actually said. Writes are refused at the
            door.
          </p>

          <div className="chips">
            <span className="chip label-sm">{TOOL_COUNT} tools</span>
            <span className="chip label-sm">Read only</span>
            <span className="chip label-sm">OAuth or token</span>
            <span className="chip label-sm">Nothing stored</span>
          </div>
        </section>

        <section className="section">
          <div className="section-label label">
            <span>01 &mdash; Connect a client</span>
            <span className="rule" />
          </div>

          <p className="body" style={{ marginBottom: 24 }}>
            Point any MCP client at the endpoint below, or register it as a Composio custom
            toolkit. Each user connects their own Product Hunt account through OAuth, so there is
            no shared token to hand around.
          </p>

          <Endpoint />
        </section>

        <section className="section">
          <div className="section-label label">
            <span>02 &mdash; Tools</span>
            <span className="rule" />
          </div>

          {TOOLS.map((group) => (
            <div key={group.group} style={{ marginBottom: 48 }}>
              <h3 className="title-sm" style={{ marginBottom: 16 }}>
                {group.group}
              </h3>
              <table className="specs">
                <tbody>
                  {group.items.map(([name, what]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <section className="section">
          <div className="section-label label">
            <span>03 &mdash; Honest limits</span>
            <span className="rule" />
          </div>

          <p className="body" style={{ marginBottom: 24 }}>
            These are properties of the Product Hunt API, not gaps in this server. Knowing them
            up front saves an afternoon.
          </p>

          <div className="grid grid-2">
            <article className="card">
              <h3 className="title-sm">No writes exist</h3>
              <p className="body">
                The public API has no mutation for voting, commenting or submitting. Write scopes
                need manual approval, so this server blocks mutations locally rather than letting
                them fail upstream.
              </p>
            </article>

            <article className="card">
              <h3 className="title-sm">Other profiles are redacted</h3>
              <p className="body">
                Without elevated access, looking up an account that is not yours returns an empty
                profile with no error. The people tools are most useful pointed at the connected
                account.
              </p>
            </article>

            <article className="card">
              <h3 className="title-sm">The schema lies</h3>
              <p className="body">
                Goals and Spaces appear in the published schema but not in the live API. Five
                tools were built against them and deleted once real calls proved they could never
                work.
              </p>
            </article>

            <article className="card">
              <h3 className="title-sm">Budgeted, not throttled</h3>
              <p className="body">
                6,250 complexity points per 15 minutes, shared across everything a token does.
                Deep queries cost more, so vote sampling caps itself.
              </p>
            </article>
          </div>
        </section>
      </div>

      <div className="shell">
        <div className="cta">
          <div className="cta-inner">
            <div className="icon-tile" aria-hidden="true">
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="square"
                strokeLinejoin="miter"
              >
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>

            <span className="label">MIT licensed</span>
            <h2 className="display-md">Deploy your own in a minute</h2>
            <a className="btn btn-on-primary" href={REPO}>
              View the source
            </a>
          </div>
        </div>

        <footer className="foot label-sm">
          <a href={REPO}>GitHub</a>
          <a href={`${REPO}/blob/main/README.md`}>Docs</a>
          <a href={`${REPO}/blob/main/SECURITY.md`}>Security</a>
          <a href="https://api.producthunt.com/v2/docs">Product Hunt API</a>
          <a href="https://pmcosta.dev">pmcosta.dev</a>
        </footer>
      </div>
    </>
  );
}
