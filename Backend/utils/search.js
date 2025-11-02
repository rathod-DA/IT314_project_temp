import axios from 'axios';
import { fetchLinksFromDuckDuckGo } from '../controllers/googleSearch.js';

// const API_KEY = process.env.SEARCH_ENGINE_KEY;
// const cx = process.env.SEARCH_ENGINE_CX;
// const API_BASE_URL = 'https://www.googleapis.com/customsearch/v1';

const API_KEY = process.env.YOUTUBE_API_KEY;
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3/search';


const getArticleLinks = async (mainTopic, subtopic) => {
  const query = subtopic.title;
  const sites = subtopic.recommendedArticleSites || [];

  try {
    if (sites.length > 0) {
      // Process sites sequentially with small delays to avoid rate limiting
      const allLinks = [];
      
      for (const site of sites) {
        const searchQuery = `${query} site:${site}`;
        try {
          const links = await fetchLinksFromDuckDuckGo(searchQuery);
          // Limit to 2 articles per site
          allLinks.push(...links.slice(0, 2));
          
          // Small delay between site requests (500ms)
          if (sites.indexOf(site) < sites.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error fetching from site ${site}:`, error.message);
        }
      }

      const uniqueLinks = [...new Set(allLinks)];
      return uniqueLinks;
    } 
  } catch (error) {
    console.error(`Error fetching articles for "${query}":`, error.message);
    return [];
  }
  
  return [];
};

const getVideoLinks = async (mainTopic, subtopic) => {
  const query = `${mainTopic} ${subtopic.title} tutorial`;
  
  try {
    const response = await axios.get(API_BASE_URL, {
      params: {
        key: API_KEY,
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 5
      }
    });

    const items = response.data.items || [];
    return items.map(item => `https://www.youtube.com/watch?v=${item.id.videoId}`);

  } catch (error) {
    if (error.response) {
      console.error('Error fetching YouTube videos:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return [];
  }
};

// const getVideoLinks = async (mainTopic, subtopic) => {
//   It will be changed to fetch using yt api

//   const query = subtopic.title + " tutorial";
//   const url = `${API_BASE_URL}?key=${API_KEY}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=youtube.com&num=5`;

//   try {
//     const response = await axios.get(url);
//     return response.data.items?.map(item => item.link) || [];
//   } catch (error) {
//     console.error('Error fetching videos:', error.message);
//     return [];
//   }
//   return [];
// };


export const getArticles = async (roadmapText) => {
  const mainTopic = roadmapText.title;
  const requests = [];

  // Store function arguments, not promises
  for (const chapter of roadmapText.chapters) {
    for (const subtopic of chapter.subtopics) {
      requests.push({
        chapterId: chapter.id,
        subtopicId: subtopic.id,
        mainTopic: mainTopic,
        subtopic: subtopic
      });
    }
  }

  // Process in batches of 5 with 2-second delay between batches
  const results = [];
  for (let i = 0; i < requests.length; i += 5) {
    const batch = requests.slice(i, i + 5);
    
    // Process current batch - create promises only when executing
    const batchPromises = batch.map(req => 
      getArticleLinks(req.mainTopic, req.subtopic).then(articleLinks => ({
        chapterId: req.chapterId,
        subtopicId: req.subtopicId,
        articles: articleLinks,
      }))
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Handle both fulfilled and rejected promises
    const successfulResults = batchResults.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Error processing batch item ${i + idx}:`, result.reason);
        return {
          chapterId: batch[idx].chapterId,
          subtopicId: batch[idx].subtopicId,
          articles: []
        };
      }
    });
    
    results.push(...successfulResults);
    
    // Add 2-second delay after every batch (except the last one)
    if (i + 5 < requests.length) {
      console.log(`Processed batch ${Math.floor(i/5) + 1}, waiting 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
};


export const getVideos = async (roadmapText) => {
  const mainTopic = roadmapText.title;
  const promises = [];

  for (const chapter of roadmapText.chapters) {
    for (const subtopic of chapter.subtopics) {
      promises.push(
        getVideoLinks(mainTopic, subtopic).then(videoLinks => ({
          chapterId: chapter.id,
          subtopicId: subtopic.id,
          videos: videoLinks,
        }))
      );
    }
  }

  return Promise.all(promises);
};
