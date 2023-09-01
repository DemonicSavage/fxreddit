import { IRequest, Router, html as HtmlResponse } from "itty-router";
import { postToHtml } from "./reddit/compile";
import { parseRedditPost } from "./reddit/parse";
import { RedditListingResponse, RedditPost } from "./reddit/types";
import { HTMLElement } from "node-html-parser";
import { CACHE_CONFIG } from "./cache";

const REDDIT_BASE_URL = "https://www.reddit.com";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.5",
};

const RESPONSE_HEADERS = {
  "Content-Type": "text/html; charset=UTF-8",
  "Cache-Control": "public, max-age=86400",
};

class ResponseError extends Error {
  constructor(public status: number, public error: string) {
    super(`${status}: ${error}`);
  }
}

async function get_post(
  id: string,
  subreddit?: string,
  slug?: string
): Promise<RedditPost> {
  let url = REDDIT_BASE_URL;
  if (subreddit && slug) {
    url += `/r/${subreddit}/comments/${id}/${slug}.json`;
  } else {
    url += `/${id}.json`;
  }

  return await fetch(url, { headers: FETCH_HEADERS, ...CACHE_CONFIG })
    .then((r) =>
      r.ok
        ? r.json<RedditListingResponse[]>()
        : Promise.reject(new ResponseError(r.status, r.statusText))
    )
    .then(([json]) => parseRedditPost(json));
}

function isBot({ headers }: IRequest): boolean {
  return headers.get("User-Agent")?.toLowerCase()?.includes("bot") ?? false;
}

function getOriginalUrl(url: string) {
  const location = new URL(url);

  if (location.hostname.endsWith(DOMAIN_URL)) {
    location.hostname = location.hostname.replace(DOMAIN_URL, "reddit.com");
  } else {
    location.hostname = "reddit.com";
  }

  location.protocol = "https:";
  location.port = "";

  return location.toString();
}

function fallbackRedirect(req: IRequest) {
  const url = getOriginalUrl(req.url);

  return HtmlResponse(
    `<head><meta http-equiv="Refresh" content="0; URL=${url.replaceAll(
      '"',
      '\\"'
    )}" /></head>`,
    {
      headers: { Location: url },
      status: 302,
    }
  );
}

const router = Router();

async function handlePost(request: IRequest) {
  const { params, url } = request;
  const { name, id, slug } = params;
  const originalLink = getOriginalUrl(url);
  const bot = isBot(request);

  const headers: HeadersInit = { ...RESPONSE_HEADERS };
  const { protocol } = new URL(url);
  if (protocol === "https:") {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
  }

  if (!bot) {
    // forcing redirect for browsers
    headers["Location"] = originalLink;
  }

  try {
    const post = await get_post(id, name, slug);
    const html = await postToHtml(post);

    html
      .querySelector("head")
      ?.appendChild(
        new HTMLElement("meta", {})
          .setAttribute("http-equiv", "Refresh")
          .setAttribute("content", `0; URL=${originalLink}`)
      );

    return new Response(html.toString(), {
      headers,
      status: bot ? 200 : 302,
    });
  } catch (err) {
    const { status } = err as ResponseError;
    if (status === 404) {
      return new Response("Post not found", {
        headers,
        status,
      });
    } else {
      throw err;
    }
  }
}

const ROBOTS_TXT = () =>
  new Response("User-agent: *\nDisallow: /", {
    headers: { "Content-Type": "text/plain" },
  });
const SECURITY_TXT = () =>
  new Response(
    "Contact: https://github.com/MinnDevelopment/fxreddit/issues/new",
    { headers: { "Content-Type": "text/plain" } }
  );
const NOT_FOUND = () => new Response("Not Found", { status: 404 });

router
  // Redirect all browser usage
  // .all('*', (req) => redirectBrowser(req))
  // Block all robots / crawlers
  .get("/robots.txt", ROBOTS_TXT)
  .get("/security.txt", SECURITY_TXT)
  .get("/*.ico", NOT_FOUND)
  .get("/*.txt", NOT_FOUND)
  .get("/*.xml", NOT_FOUND)
  // Otherwise, if its a bot we respond with a meta tag page
  .get("/r/:name/comments/:id/:slug?", handlePost)
  .get("/:id", handlePost)
  // On missing routes we simply redirect
  .all("*", fallbackRedirect);

addEventListener("fetch", (event) => {
  event.respondWith(
    router.handle(event.request).catch((err) => {
      // Extend the event lifetime until the response from Sentry has resolved.
      // Docs: https://developers.cloudflare.com/workers/runtime-apis/fetch-event#methods
      console.error(err);

      // Respond to the original request while the error is being logged (above).
      return new Response(err.message || "Internal Server Error", {
        status: 500,
      });
    })
  );
});
