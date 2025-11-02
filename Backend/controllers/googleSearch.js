import axios from "axios";
import * as cheerio from "cheerio";

export async function fetchLinksFromDuckDuckGo(query) {
  const url = "https://html.duckduckgo.com/html/";
  
  const params = new URLSearchParams();
  params.append("q", query);

  try {
    const { data } = await axios.post(url, params, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://html.duckduckgo.com/",
        "Origin": "https://html.duckduckgo.com"
      },
    });

    const $ = cheerio.load(data);
    const links = [];

    $("#links .result__title a.result__a").each((i, el) => {
      const href = $(el).attr("href");
      if (href) {
        links.push(href);
      }
    });
    console.log(links.slice(0, 2));
    return links;

  } catch (err) {
      console.error(" Error:", err);
    return [];
  }
}

// (async () => {
//   const query = "polymorphism in java article site:stackoverflow.com";
//   await fetchLinksFromDuckDuckGo(query);
// })();